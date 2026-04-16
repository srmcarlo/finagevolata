"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { documentReviewSchema } from "@finagevolata/shared";
import { sendDocumentUploadedEmail } from "@/lib/email";
import { validateDocumentWithAI } from "@/lib/services/ai-validator";


export async function uploadDocument(practiceDocId: string, formData: FormData) {
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
                company: { include: { companyProfile: true } } 
            } 
        }, 
        documentType: true 
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
    return { error: `Errore upload: ${uploadError.message}` };
  }

  let expiresAt: Date | null = null;
  if (practiceDoc.documentType.validityDays) {
    expiresAt = new Date(Date.now() + practiceDoc.documentType.validityDays * 86400000);
  }

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
        detail: `Ha caricato "${practiceDoc.documentType.name}"`,
      },
    }),
  ]);

  return { success: true };
}

export async function reviewDocument(practiceDocId: string, formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId || (session?.user as any)?.role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  const raw = {
    status: formData.get("status") as string,
    rejectionReason: formData.get("rejectionReason") as string || undefined,
  };

  const parsed = documentReviewSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const practiceDoc = await prisma.practiceDocument.findUnique({
    where: { id: practiceDocId },
    include: { practice: true, documentType: true },
  });
  if (!practiceDoc || practiceDoc.practice.consultantId !== userId) {
    return { error: "Documento non trovato" };
  }
  if (practiceDoc.status !== "UPLOADED") {
    return { error: "Il documento non è in stato 'Caricato'" };
  }

  const isApproved = parsed.data.status === "APPROVED";

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
          ? `Ha approvato "${practiceDoc.documentType.name}"`
          : `Ha rifiutato "${practiceDoc.documentType.name}"${parsed.data.rejectionReason ? `: ${parsed.data.rejectionReason}` : ""}`,
      },
    }),
  ]);

  return { success: true };
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
      documentType: true 
    },
  });
  
  if (!practiceDoc || !practiceDoc.filePath) {
    return { error: "Documento non trovato o file mancante" };
  }

  const companyName = practiceDoc.practice.company.name;
  const docTypeName = practiceDoc.documentType.name;

  // Richiamo Gemini (Google AI SDK integrato)
  const result = await validateDocumentWithAI(practiceDoc.filePath, docTypeName, companyName);

  // Auto-aggiorniamo il documento e il log in base a `result.isValid`
  const newStatus = result.isValid ? "APPROVED" : "REJECTED";
  
  await prisma.$transaction([
    prisma.practiceDocument.update({
      where: { id: practiceDocId },
      data: {
        status: newStatus,
        rejectionReason: result.isValid ? null : `Rifiutato da AI: ${result.notes}`,
        reviewedAt: new Date(),
        reviewedById: userId, // Il consulente che ha triggerato la AI
      },
    }),
    prisma.practiceActivity.create({
      data: {
        practiceId: practiceDoc.practiceId,
        actorId: userId,
        type: result.isValid ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
        detail: `[Controllo AI] ${result.isValid ? "Approvato" : "Rifiutato"}: ${docTypeName} - Note: ${result.notes}`,
      },
    }),
  ]);

  return { 
    success: true, 
    status: newStatus, 
    notes: result.notes 
  };
}
