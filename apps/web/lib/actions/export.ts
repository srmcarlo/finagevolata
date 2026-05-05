"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { sendClickDayRequestEmail } from "@/lib/email";
import {
  buildClickDayEmailText,
  computeLinkExpirySeconds,
} from "@/lib/services/click-day-export";

const MAX_NOTES_LENGTH = 500;
const STORAGE_BUCKET = "documents";

export async function exportForClickDay(practiceId: string, notes: string = "") {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId || role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return { error: `Le note non possono superare ${MAX_NOTES_LENGTH} caratteri` };
  }

  const mousexEmail = process.env.MOUSEX_EMAIL;
  if (!mousexEmail) {
    return { error: "MOUSEX_EMAIL non configurato" };
  }

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      grant: true,
      company: { include: { companyProfile: true } },
      consultant: true,
      documents: { include: { documentType: true } },
    },
  });

  if (!practice || practice.consultantId !== userId) {
    return { error: "Pratica non trovata" };
  }

  if (!practice.grant.hasClickDay) {
    return { error: "Questo bando non prevede Click Day" };
  }

  const allApproved = practice.documents.every((d) => d.status === "APPROVED");
  if (!allApproved) {
    return { error: "Tutti i documenti devono essere approvati prima dell'export" };
  }

  const profile = practice.company.companyProfile;
  if (!profile) {
    return { error: "Profilo azienda incompleto" };
  }

  const now = new Date();
  const expirySeconds = computeLinkExpirySeconds(practice.grant.clickDayDate, now);
  const linkExpiry = new Date(now.getTime() + expirySeconds * 1000);

  const supabase = createServerSupabase();
  const docsWithUrls: Array<{ name: string; url: string }> = [];
  for (const doc of practice.documents) {
    if (!doc.filePath) {
      return { error: `File mancante per documento "${doc.documentType.name}"` };
    }
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.filePath, expirySeconds);
    if (error || !data?.signedUrl) {
      return { error: `Errore generazione link per "${doc.documentType.name}"` };
    }
    docsWithUrls.push({ name: doc.documentType.name, url: data.signedUrl });
  }

  const text = buildClickDayEmailText({
    grant: {
      title: practice.grant.title,
      issuingBody: practice.grant.issuingBody,
      clickDayDate: practice.grant.clickDayDate,
    },
    company: {
      companyName: profile.companyName,
      vatNumber: profile.vatNumber,
      legalForm: profile.legalForm,
      atecoCode: profile.atecoCode,
      atecoDescription: profile.atecoDescription,
      region: profile.region,
      province: profile.province,
    },
    documents: docsWithUrls,
    consultant: {
      name: practice.consultant.name,
      email: practice.consultant.email,
    },
    notes,
    linkExpiry,
  });

  const emailResult = await sendClickDayRequestEmail({
    to: mousexEmail,
    cc: practice.consultant.email,
    grantTitle: practice.grant.title,
    companyName: profile.companyName,
    text,
  });

  if (!emailResult.success) {
    return { error: "Invio email fallito. Riprova più tardi." };
  }

  await prisma.practice.update({
    where: { id: practiceId },
    data: { clickDayStatus: "REQUESTED" },
  });

  const detailSuffix = notes.trim() ? ` — note: ${notes.trim()}` : "";
  await prisma.practiceActivity.create({
    data: {
      practiceId,
      actorId: userId,
      type: "CLICKDAY_EXPORT",
      detail: `Richiesta Click Day inviata a MouseX${detailSuffix}`,
    },
  });

  return { success: true as const, sentAt: now };
}
