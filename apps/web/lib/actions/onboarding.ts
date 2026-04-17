"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CompanyProfileSchema = z.object({
  vatNumber: z.string().regex(/^\d{11}$/, "P.IVA deve essere 11 cifre"),
  companyName: z.string().min(2),
  legalForm: z.string().min(1),
  atecoCode: z.string().min(2),
  atecoDescription: z.string().min(2),
  province: z.string().length(2, "Sigla provincia 2 lettere"),
  region: z.string().min(2),
  employeeCount: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]),
});

export async function saveCompanyProfile(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = CompanyProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await prisma.companyProfile.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  return { success: true };
}

export async function saveInterests(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Non autorizzato");

  const subscribe = formData.get("subscribe") === "on";

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscribedToGrantAlerts: subscribe,
      onboardingCompletedAt: new Date(),
    },
  });

  redirect("/azienda");
}

const ConsultantProfileSchema = z.object({
  firmName: z.string().min(2),
  specializations: z.array(z.string()).optional(),
  maxClients: z.coerce.number().int().min(1).max(1000),
});

export async function saveConsultantProfile(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const raw = {
    firmName: formData.get("firmName"),
    specializations: formData.getAll("specializations"),
    maxClients: formData.get("maxClients"),
  };
  const parsed = ConsultantProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await prisma.consultantProfile.upsert({
    where: { userId },
    create: {
      userId,
      firmName: parsed.data.firmName,
      specializations: parsed.data.specializations ?? [],
      maxClients: parsed.data.maxClients,
    },
    update: {
      firmName: parsed.data.firmName,
      specializations: parsed.data.specializations ?? [],
      maxClients: parsed.data.maxClients,
    },
  });

  return { success: true };
}

export async function finishConsultantOnboarding(): Promise<void> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Non autorizzato");

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  });

  redirect("/consulente");
}

export async function lookupVat(vatNumber: string) {
  const { getCciaaProvider } = await import("@/lib/cciaa");
  const provider = getCciaaProvider();
  return provider.lookup(vatNumber);
}
