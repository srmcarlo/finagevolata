"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createGrantWithDocuments(formData: FormData) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return { error: "Non autorizzato" };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const issuingBody = formData.get("issuingBody") as string;
  const grantType = formData.get("grantType") as string;
  const maxAmount = formData.get("maxAmount") ? Number(formData.get("maxAmount")) : null;
  const deadline = formData.get("deadline") ? new Date(formData.get("deadline") as string) : null;
  const hasClickDay = formData.get("hasClickDay") === "true";
  const eligibleAtecoCodes = formData.get("eligibleAtecoCodes")
    ? (formData.get("eligibleAtecoCodes") as string).split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const sourceUrl = (formData.get("sourceUrl") as string) || null;
  const documentTypeIds = formData.getAll("documentTypeIds") as string[];

  if (!title || !description || !issuingBody || !grantType) {
    return { error: "Compila tutti i campi obbligatori" };
  }

  await prisma.grant.create({
    data: {
      title,
      description,
      issuingBody,
      grantType: grantType as any,
      maxAmount,
      deadline,
      hasClickDay,
      eligibleAtecoCodes,
      eligibleRegions: [],
      eligibleCompanySizes: [],
      sourceUrl,
      createdById: (session.user as any).id,
      approvedByAdmin: true,
      status: "PUBLISHED",
      documentRequirements: {
        create: documentTypeIds.map((dtId, index) => ({
          documentTypeId: dtId,
          isRequired: true,
          order: index + 1,
        })),
      },
    },
  });

  return { success: true };
}
