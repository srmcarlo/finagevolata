"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { grantCreateSchema, isGrantEligible } from "@finagevolata/shared";
import { indexGrant, findSemanticMatches } from "@/lib/services/ai";

export async function createGrant(formData: FormData) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "CONSULTANT")) {
    return { error: "Non autorizzato" };
  }
  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    issuingBody: formData.get("issuingBody") as string,
    grantType: formData.get("grantType") as string,
    minAmount: formData.get("minAmount") ? Number(formData.get("minAmount")) : undefined,
    maxAmount: formData.get("maxAmount") ? Number(formData.get("maxAmount")) : undefined,
    deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string).toISOString() : undefined,
    openDate: formData.get("openDate") ? new Date(formData.get("openDate") as string).toISOString() : undefined,
    hasClickDay: formData.get("hasClickDay") === "true",
    clickDayDate: formData.get("clickDayDate") ? new Date(formData.get("clickDayDate") as string).toISOString() : undefined,
    eligibleAtecoCodes: formData.get("eligibleAtecoCodes") ? (formData.get("eligibleAtecoCodes") as string).split(",").map(s => s.trim()).filter(Boolean) : [],
    eligibleRegions: formData.getAll("eligibleRegions") as string[],
    eligibleCompanySizes: formData.getAll("eligibleCompanySizes") as string[],
    sourceUrl: formData.get("sourceUrl") as string || "",
    documentRequirements: [],
  };
  const parsed = grantCreateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  
  const isAdmin = role === "ADMIN";
  
  const newGrant = await prisma.grant.create({
    data: {
      title: parsed.data.title, 
      description: parsed.data.description,
      issuingBody: parsed.data.issuingBody, 
      grantType: parsed.data.grantType,
      minAmount: parsed.data.minAmount, 
      maxAmount: parsed.data.maxAmount,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      openDate: parsed.data.openDate ? new Date(parsed.data.openDate) : null,
      hasClickDay: parsed.data.hasClickDay,
      clickDayDate: parsed.data.clickDayDate ? new Date(parsed.data.clickDayDate) : null,
      eligibleAtecoCodes: parsed.data.eligibleAtecoCodes,
      eligibleRegions: parsed.data.eligibleRegions,
      eligibleCompanySizes: parsed.data.eligibleCompanySizes,
      sourceUrl: parsed.data.sourceUrl || null,
      createdById: (session.user as any).id,
      approvedByAdmin: isAdmin, 
      status: isAdmin ? "PUBLISHED" : "DRAFT",
    },
  });

  // Indicizza per AI dopo la creazione
  await indexGrant(newGrant.id, `${newGrant.title}. ${newGrant.description}`);

  return { success: true };
}

export async function getGrants() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role === "ADMIN") return prisma.grant.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } });
  if (role === "CONSULTANT") return prisma.grant.findMany({ where: { OR: [{ status: "PUBLISHED", approvedByAdmin: true }, { createdById: (session?.user as any).id }] }, orderBy: { createdAt: "desc" } });
  return prisma.grant.findMany({ where: { status: "PUBLISHED", approvedByAdmin: true }, orderBy: { createdAt: "desc" } });
}

export async function getMatchingGrants(companyId: string) {
  const profile = await prisma.companyProfile.findUnique({ where: { userId: companyId } });
  if (!profile) return [];
  const grants = await prisma.grant.findMany({ where: { status: "PUBLISHED", approvedByAdmin: true } });
  return grants.filter((grant) => isGrantEligible(
    { 
        eligibleAtecoCodes: grant.eligibleAtecoCodes, 
        eligibleRegions: grant.eligibleRegions, 
        eligibleCompanySizes: grant.eligibleCompanySizes, 
        status: grant.status, 
        deadline: grant.deadline?.toISOString() ?? null 
    },
    { atecoCode: profile.atecoCode, region: profile.region, employeeCount: profile.employeeCount }
  ));
}

export async function getAISemanticMatches(companyId: string) {
  const session = await auth();
  if (!session?.user) return [];
  return findSemanticMatches(companyId);
}

export async function approveGrant(grantId: string) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") return { error: "Non autorizzato" };
  await prisma.grant.update({ where: { id: grantId }, data: { approvedByAdmin: true, status: "PUBLISHED" } });
  
  // Re-indicizza all'approvazione per sicurezza
  const grant = await prisma.grant.findUnique({ where: { id: grantId } });
  if (grant) {
    await indexGrant(grantId, `${grant.title}. ${grant.description}`);
  }

  return { success: true };
}
