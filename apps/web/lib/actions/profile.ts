"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyOnboardingSchema } from "@finagevolata/shared";
import { z } from "zod";

const consultantProfileSchema = z.object({
  firmName: z.string().min(1, "Nome studio obbligatorio"),
  specializations: z.string(),
  maxClients: z.coerce.number().min(1).max(999),
});

export async function updateCompanyProfile(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId || (session?.user as any)?.role !== "COMPANY") {
    return { error: "Non autorizzato" };
  }

  const existing = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!existing) return { error: "Profilo non trovato" };

  const raw = {
    vatNumber: formData.get("vatNumber") as string,
    companyName: formData.get("companyName") as string,
    legalForm: formData.get("legalForm") as string,
    atecoCode: formData.get("atecoCode") as string,
    atecoDescription: formData.get("atecoDescription") as string,
    province: formData.get("province") as string,
    region: formData.get("region") as string,
    employeeCount: formData.get("employeeCount") as string,
  };

  const parsed = companyOnboardingSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Check if VAT changed and is already taken by another company
  if (parsed.data.vatNumber !== existing.vatNumber) {
    const duplicate = await prisma.companyProfile.findUnique({
      where: { vatNumber: parsed.data.vatNumber },
    });
    if (duplicate) return { error: "Partita IVA già registrata da un'altra azienda" };
  }

  await prisma.companyProfile.update({
    where: { userId },
    data: parsed.data,
  });

  return { success: true };
}

export async function updateConsultantProfile(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId || (session?.user as any)?.role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  const raw = {
    firmName: formData.get("firmName") as string,
    specializations: formData.get("specializations") as string,
    maxClients: formData.get("maxClients") as string,
  };

  const parsed = consultantProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const specializations = parsed.data.specializations
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.consultantProfile.upsert({
    where: { userId },
    update: {
      firmName: parsed.data.firmName,
      specializations,
      maxClients: parsed.data.maxClients,
    },
    create: {
      userId,
      firmName: parsed.data.firmName,
      specializations,
      maxClients: parsed.data.maxClients,
    },
  });

  return { success: true };
}
