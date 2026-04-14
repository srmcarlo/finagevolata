"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function exportForClickDay(practiceId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId || (session?.user as any)?.role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      grant: true,
      company: { include: { companyProfile: true } },
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

  const exportData = {
    exportDate: new Date().toISOString(),
    practice: {
      id: practice.id,
      status: practice.status,
    },
    grant: {
      title: practice.grant.title,
      issuingBody: practice.grant.issuingBody,
      clickDayDate: practice.grant.clickDayDate?.toISOString() || null,
    },
    company: {
      name: profile?.companyName || practice.company.name,
      vatNumber: profile?.vatNumber || "N/A",
      atecoCode: profile?.atecoCode || "N/A",
      legalForm: profile?.legalForm || "N/A",
      region: profile?.region || "N/A",
      province: profile?.province || "N/A",
    },
    documents: practice.documents.map((d) => ({
      type: d.documentType.name,
      status: d.status,
      fileName: d.fileName,
      filePath: d.filePath,
    })),
  };

  await prisma.practice.update({
    where: { id: practiceId },
    data: { clickDayStatus: "REQUESTED" },
  });

  return { success: true, data: exportData };
}
