"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyOnboardingSchema, companyInviteSchema } from "@finagevolata/shared";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "COMPANY") {
    return { error: "Non autorizzato" };
  }

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
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const existing = await prisma.companyProfile.findUnique({
    where: { vatNumber: parsed.data.vatNumber },
  });
  if (existing) {
    return { error: "Partita IVA già registrata" };
  }

  await prisma.companyProfile.create({
    data: {
      userId: (session.user as any).id,
      ...parsed.data,
    },
  });

  return { success: true };
}

export async function inviteCompany(formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  const parsed = companyInviteSchema.safeParse({
    companyEmail: formData.get("companyEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const company = await prisma.user.findUnique({
    where: { email: parsed.data.companyEmail, role: "COMPANY" },
  });
  if (!company) {
    return { error: "Nessuna azienda trovata con questa email" };
  }

  const existingRelation = await prisma.consultantCompany.findUnique({
    where: {
      consultantId_companyId: {
        consultantId: (session.user as any).id,
        companyId: company.id,
      },
    },
  });
  if (existingRelation) {
    return { error: "Invito già inviato a questa azienda" };
  }

  await prisma.consultantCompany.create({
    data: {
      consultantId: (session.user as any).id,
      companyId: company.id,
    },
  });

  return { success: true };
}

export async function respondToInvitation(invitationId: string, accept: boolean) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "COMPANY") {
    return { error: "Non autorizzato" };
  }

  const invitation = await prisma.consultantCompany.findUnique({
    where: { id: invitationId, companyId: (session.user as any).id },
  });
  if (!invitation || invitation.status !== "PENDING") {
    return { error: "Invito non trovato" };
  }

  await prisma.consultantCompany.update({
    where: { id: invitationId },
    data: {
      status: accept ? "ACTIVE" : "REVOKED",
      acceptedAt: accept ? new Date() : undefined,
    },
  });

  return { success: true };
}

export async function getMyClients() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CONSULTANT") return [];

  return prisma.consultantCompany.findMany({
    where: { consultantId: (session.user as any).id },
    include: {
      company: {
        include: { companyProfile: true },
      },
    },
    orderBy: { invitedAt: "desc" },
  });
}
