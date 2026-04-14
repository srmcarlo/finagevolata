"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceCreateSchema } from "@finagevolata/shared";

export async function createPractice(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId || role !== "CONSULTANT") return { error: "Non autorizzato" };

  const parsed = practiceCreateSchema.safeParse({
    grantId: formData.get("grantId"),
    companyId: formData.get("companyId"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const relation = await prisma.consultantCompany.findUnique({
    where: { consultantId_companyId: { consultantId: userId, companyId: parsed.data.companyId }, status: "ACTIVE" },
  });
  if (!relation) return { error: "Non sei collegato a questa azienda" };

  const grant = await prisma.grant.findUnique({
    where: { id: parsed.data.grantId },
    include: { documentRequirements: { include: { documentType: true } } },
  });
  if (!grant || grant.status !== "PUBLISHED") return { error: "Bando non trovato o non attivo" };

  const practice = await prisma.practice.create({
    data: {
      grantId: grant.id, companyId: parsed.data.companyId, consultantId: userId,
      status: "DOCUMENTS_PENDING",
      documents: {
        create: grant.documentRequirements.map((req) => ({
          documentTypeId: req.documentTypeId, status: "MISSING",
          expiresAt: req.documentType.validityDays ? new Date(Date.now() + req.documentType.validityDays * 86400000) : null,
        })),
      },
    },
  });
  return { success: true, practiceId: practice.id };
}

export async function getPractices() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const where = role === "ADMIN" ? {} : role === "CONSULTANT" ? { consultantId: userId } : { companyId: userId };
  return prisma.practice.findMany({
    where, include: { grant: true, company: { include: { companyProfile: true } }, consultant: true, _count: { select: { documents: true } }, documents: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPractice(id: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const practice = await prisma.practice.findUnique({
    where: { id },
    include: { grant: true, company: { include: { companyProfile: true } }, consultant: { include: { consultantProfile: true } }, documents: { include: { documentType: true, reviewedBy: true }, orderBy: { documentType: { name: "asc" } } } },
  });
  if (!practice) return null;
  if (role === "CONSULTANT" && practice.consultantId !== userId) return null;
  if (role === "COMPANY" && practice.companyId !== userId) return null;
  return practice;
}

export async function updatePracticeStatus(practiceId: string, status: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (role !== "CONSULTANT") return { error: "Non autorizzato" };
  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice || practice.consultantId !== userId) return { error: "Pratica non trovata" };
  await prisma.practice.update({ where: { id: practiceId }, data: { status: status as any } });
  return { success: true };
}
