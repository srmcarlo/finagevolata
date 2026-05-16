"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cacheTags } from "@/lib/cache/keys";
import { createServerSupabase } from "@/lib/supabase";
import { documentReviewSchema } from "@finagevolata/shared";
import { sendDocumentUploadedEmail, sendDocumentReviewedEmail } from "@/lib/email";
import { validateDocumentWithAI } from "@/lib/services/ai-validator";


export async function uploadDocument(practiceDocId: string, formData: FormData) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[uploadDocument] missing Supabase env vars");
      return { error: "Storage non configurato (env var mancanti)" };
    }

    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId || (session?.user as any)?.role !== "COMPANY") {
      return { error: "Non autorizzato" };
    }

    const file = formData.get("file") as File;
    if (!file || file.size === 0) return { error: "File richiesto" };

    const practiceDoc = await prisma.practiceDocument.findUnique({
      where: { id: practiceDocId },
      include: {
        practice: {
          include: {
            consultant: true,
            company: { include: { companyProfile: true } },
          },
        },
        documentType: true,
      },
    });
    if (!practiceDoc || practiceDoc.practice.companyId !== userId) {
      return { error: "Documento non trovato" };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!practiceDoc.documentType.acceptedFormats.includes(ext)) {
      return { error: `Formato non accettato. Formati validi: ${practiceDoc.documentType.acceptedFormats.join(", ")}` };
    }

    const maxBytes = practiceDoc.documentType.maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return { error: `File troppo grande. Max: ${practiceDoc.documentType.maxSizeMb}MB` };
    }

    const supabase = createServerSupabase();
    const filePath = `practices/${practiceDoc.practiceId}/${practiceDoc.documentType.slug}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error("[uploadDocument] Supabase upload error:", uploadError);
      return { error: `Errore upload: ${uploadError.message}` };
    }

    let expiresAt: Date | null = null;
    if (practiceDoc.documentType.validityDays) {
      expiresAt = new Date(Date.now() + practiceDoc.documentType.validityDays * 86400000);
    }

    const consultantId = practiceDoc.practice.consultantId;
    const companyName = practiceDoc.practice.company.companyProfile?.companyName ?? practiceDoc.practice.company.name;
    const docName = practiceDoc.documentType.name;

    await prisma.$transaction([
      prisma.practiceDocument.update({
        where: { id: practiceDocId },
        data: {
          status: "UPLOADED",
          filePath,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date(),
          expiresAt,
          version: { increment: 1 },
          rejectionReason: null,
        },
      }),
      prisma.practiceActivity.create({
        data: {
          practiceId: practiceDoc.practiceId,
          actorId: userId,
          type: "DOCUMENT_UPLOADED",
          detail: `Ha caricato "${docName}"`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: consultantId,
          type: "DOCUMENT_REQUESTED",
          title: "Nuovo documento caricato",
          message: `${companyName} ha caricato "${docName}". Revisiona il documento.`,
          practiceId: practiceDoc.practiceId,
        },
      }),
    ]);

    // Email al consulente (fuori dalla transaction — fallimento non blocca upload)
    const consultant = practiceDoc.practice.consultant;
    sendDocumentUploadedEmail(consultant.email, companyName, docName).catch((e) =>
      console.error("[Email] Upload notification failed:", e)
    );

    revalidateTag(cacheTags.counts(practiceDoc.practice.companyId));

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[uploadDocument] fatal:", msg, err);
    return { error: `Errore server: ${msg}` };
  }
}

export async function reviewDocument(practiceDocId: string, formData: FormData) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;
    if (!userId || role !== "CONSULTANT") {
      console.error("[reviewDocument] unauthorized", { userId, role });
      return { error: "Non autorizzato" };
    }

    const raw = {
      status: formData.get("status") as string,
      rejectionReason: (formData.get("rejectionReason") as string) || undefined,
    };

    const parsed = documentReviewSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const practiceDoc = await prisma.practiceDocument.findUnique({
      where: { id: practiceDocId },
      include: { practice: { include: { company: true } }, documentType: true },
    });
    if (!practiceDoc) return { error: "Documento non trovato" };
    if (practiceDoc.practice.consultantId !== userId) {
      console.error("[reviewDocument] consultant mismatch", {
        docConsultant: practiceDoc.practice.consultantId,
        sessionUser: userId,
      });
      return { error: "Non autorizzato (consulente diverso)" };
    }
    const reviewable = ["UPLOADED", "APPROVED", "REJECTED", "IN_REVIEW"];
    if (!reviewable.includes(practiceDoc.status)) {
      return { error: `Documento in stato "${practiceDoc.status}", non revisionabile` };
    }

    const isApproved = parsed.data.status === "APPROVED";
    const companyId = practiceDoc.practice.companyId;
    const docName = practiceDoc.documentType.name;

    await prisma.$transaction([
      prisma.practiceDocument.update({
        where: { id: practiceDocId },
        data: {
          status: parsed.data.status,
          rejectionReason: parsed.data.rejectionReason || null,
          reviewedAt: new Date(),
          reviewedById: userId,
        },
      }),
      prisma.practiceActivity.create({
        data: {
          practiceId: practiceDoc.practiceId,
          actorId: userId,
          type: isApproved ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
          detail: isApproved
            ? `Ha approvato "${docName}"`
            : `Ha rifiutato "${docName}"${parsed.data.rejectionReason ? `: ${parsed.data.rejectionReason}` : ""}`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: companyId,
          type: "DOCUMENT_REVIEWED",
          title: isApproved ? `Documento approvato: ${docName}` : `Documento rifiutato: ${docName}`,
          message: isApproved
            ? `Il consulente ha approvato "${docName}".`
            : `Il consulente ha rifiutato "${docName}"${parsed.data.rejectionReason ? `: ${parsed.data.rejectionReason}` : ""}. Carica una versione corretta.`,
          practiceId: practiceDoc.practiceId,
        },
      }),
    ]);

    const companyEmail = practiceDoc.practice.company.email;
    sendDocumentReviewedEmail(companyEmail, docName, isApproved, parsed.data.rejectionReason).catch((e) =>
      console.error("[Email] Review notification failed:", e)
    );

    revalidateTag(cacheTags.counts(companyId));
    revalidatePath(`/consulente/pratiche/${practiceDoc.practiceId}`);
    revalidatePath(`/azienda/pratiche/${practiceDoc.practiceId}`);

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[reviewDocument] fatal:", msg, err);
    return { error: `Errore server: ${msg}` };
  }
}

export async function getDocumentUrl(practiceDocId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const practiceDoc = await prisma.practiceDocument.findUnique({
    where: { id: practiceDocId },
    include: { practice: true },
  });
  if (!practiceDoc || !practiceDoc.filePath) return { error: "File non trovato" };

  const role = (session?.user as any)?.role;
  if (role === "COMPANY" && practiceDoc.practice.companyId !== userId) return { error: "Non autorizzato" };
  if (role === "CONSULTANT" && practiceDoc.practice.consultantId !== userId) return { error: "Non autorizzato" };

  const supabase = createServerSupabase();
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(practiceDoc.filePath, 300);

  if (!data?.signedUrl) return { error: "Errore generazione URL" };

  return { url: data.signedUrl };
}

export async function aiValidateDocument(practiceDocId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  if (!userId || (role !== "CONSULTANT" && role !== "ADMIN")) {
    return { error: "Non autorizzato" };
  }

  const practiceDoc = await prisma.practiceDocument.findUnique({
    where: { id: practiceDocId },
    include: {
      practice: { include: { company: true } },
      documentType: true,
    },
  });

  if (!practiceDoc || !practiceDoc.filePath) {
    return { error: "Documento non trovato o file mancante" };
  }

  const companyName = practiceDoc.practice.company.name;
  const docTypeName = practiceDoc.documentType.name;

  const result = await validateDocumentWithAI(practiceDoc.filePath, docTypeName, companyName);

  return {
    success: true,
    isValid: result.isValid,
    notes: result.notes,
  };
}
