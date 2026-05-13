// apps/web/lib/actions/grants.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  grantCreateSchema,
  grantUpdateSchema,
  isGrantEligible,
  type GrantCreateInput,
  type GrantUpdateInput,
} from "@finagevolata/shared";
import {
  sendGrantSubmittedEmail,
  sendGrantRejectedEmail,
} from "@/lib/email";
import { findSemanticMatches } from "@/lib/services/ai";
import { invalidateMatchExplanations } from "@/lib/actions/matching";

type Role = "ADMIN" | "CONSULTANT" | "COMPANY";

async function requireSession(allowed: Role[]) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: Role; name?: string } | undefined;
  if (!user?.id) throw new Error("Non autorizzato");
  if (!allowed.includes(user.role as Role)) throw new Error("Accesso negato");
  return { userId: user.id, role: user.role as Role, name: user.name };
}

function normalizeGrantData(parsed: GrantCreateInput | GrantUpdateInput) {
  const { documentRequirements, sourceUrl, deadline, openDate, clickDayDate, ...rest } =
    parsed as GrantCreateInput;
  return {
    data: {
      ...rest,
      deadline: deadline ? new Date(deadline) : null,
      openDate: openDate ? new Date(openDate) : null,
      clickDayDate: clickDayDate ? new Date(clickDayDate) : null,
      sourceUrl: sourceUrl === "" ? null : sourceUrl ?? null,
    },
    documentRequirements,
  };
}

export async function createGrant(input: GrantCreateInput) {
  const { userId, role, name } = await requireSession(["ADMIN", "CONSULTANT"]);
  const parsed = grantCreateSchema.parse(input);
  const { data, documentRequirements } = normalizeGrantData(parsed);

  const grant = await prisma.grant.create({
    data: {
      ...data,
      createdById: userId,
      status: "DRAFT",
      approvedByAdmin: role === "ADMIN",
      documentRequirements: {
        create: (documentRequirements ?? []).map((d) => ({
          documentTypeId: d.documentTypeId,
          isRequired: d.isRequired ?? true,
          notes: d.notes ?? null,
          order: d.order ?? 0,
        })),
      },
    },
  });

  if (role === "CONSULTANT") {
    sendGrantSubmittedEmail({
      consultantName: name ?? "Un consulente",
      grantTitle: parsed.title,
    }).catch((err) => console.error("Grant submission email failed:", err));
  }

  revalidatePath("/admin/bandi");
  revalidatePath("/admin/bandi/queue");
  if (role === "CONSULTANT") revalidatePath("/consulente/bandi");
  return grant;
}

export async function updateGrant(id: string, input: GrantUpdateInput) {
  const { userId, role } = await requireSession(["ADMIN", "CONSULTANT"]);
  const existing = await prisma.grant.findUnique({ where: { id } });
  if (!existing) throw new Error("Bando non trovato");

  if (role === "CONSULTANT") {
    if (existing.createdById !== userId) {
      throw new Error("Non puoi modificare un bando altrui");
    }
    if (existing.approvedByAdmin) {
      throw new Error("Bando già approvato, non modificabile");
    }
  }

  const parsed = grantUpdateSchema.parse(input);
  const { data, documentRequirements } = normalizeGrantData(parsed);

  await prisma.$transaction(async (tx) => {
    await tx.grant.update({ where: { id }, data });
    if (documentRequirements !== undefined) {
      await tx.grantDocumentRequirement.deleteMany({ where: { grantId: id } });
      if (documentRequirements.length > 0) {
        await tx.grantDocumentRequirement.createMany({
          data: documentRequirements.map((d) => ({
            grantId: id,
            documentTypeId: d.documentTypeId,
            isRequired: d.isRequired ?? true,
            notes: d.notes ?? null,
            order: d.order ?? 0,
          })),
        });
      }
    }
  });

  await invalidateMatchExplanations({ grantId: id });

  revalidatePath(`/admin/bandi/${id}`);
  revalidatePath("/admin/bandi");
  if (role === "CONSULTANT") revalidatePath(`/consulente/bandi/${id}`);
}

export async function deleteGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.delete({ where: { id } });
  revalidatePath("/admin/bandi");
}

export async function approveGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.update({
    where: { id },
    data: { approvedByAdmin: true },
  });
  await invalidateMatchExplanations({ grantId: id });
  revalidatePath("/admin/bandi");
  revalidatePath("/admin/bandi/queue");
  revalidatePath(`/admin/bandi/${id}`);
}

export async function rejectGrant(id: string, reason: string) {
  await requireSession(["ADMIN"]);
  if (!reason || reason.trim().length < 3) {
    throw new Error("Motivo rifiuto troppo corto");
  }
  const grant = await prisma.grant.findUnique({
    where: { id },
    include: { createdBy: { select: { email: true, name: true } } },
  });
  if (!grant) throw new Error("Bando non trovato");

  await prisma.grant.delete({ where: { id } });

  sendGrantRejectedEmail({
    to: grant.createdBy.email,
    consultantName: grant.createdBy.name ?? "Consulente",
    grantTitle: grant.title,
    reason,
  }).catch((err) => console.error("Reject email failed:", err));

  revalidatePath("/admin/bandi/queue");
  revalidatePath("/admin/bandi");
}

export async function publishGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.update({
    where: { id },
    data: { status: "PUBLISHED", approvedByAdmin: true },
  });
  await invalidateMatchExplanations({ grantId: id });
  revalidatePath(`/admin/bandi/${id}`);
  revalidatePath("/admin/bandi");
  revalidatePath("/azienda/bandi");
  revalidatePath("/consulente/bandi");
}

export async function closeGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.update({
    where: { id },
    data: { status: "CLOSED" },
  });
  await invalidateMatchExplanations({ grantId: id });
  revalidatePath(`/admin/bandi/${id}`);
  revalidatePath("/admin/bandi");
}

// --- Read helpers (kept until Tasks 10/11/12 move them to page-specific loaders) ---

export async function getGrants() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: Role } | undefined;
  const role = user?.role;
  if (role === "ADMIN") {
    return prisma.grant.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: true },
    });
  }
  if (role === "CONSULTANT") {
    return prisma.grant.findMany({
      where: {
        OR: [
          { status: "PUBLISHED", approvedByAdmin: true },
          { createdById: user!.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGrantsPaginated(page = 1, pageSize = 20) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: Role } | undefined;
  const role = user?.role;

  const where =
    role === "ADMIN"
      ? {}
      : role === "CONSULTANT"
        ? {
            OR: [
              { status: "PUBLISHED" as const, approvedByAdmin: true },
              { createdById: user!.id! },
            ],
          }
        : { status: "PUBLISHED" as const, approvedByAdmin: true };

  const [items, total] = await prisma.$transaction([
    prisma.grant.findMany({
      where,
      include: role === "ADMIN" ? { createdBy: true } : undefined,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.grant.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getMatchingGrants(companyUserId: string) {
  const profile = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
  });
  if (!profile) return [];
  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
  });
  return grants.filter((grant) =>
    isGrantEligible(
      {
        eligibleAtecoCodes: grant.eligibleAtecoCodes,
        eligibleRegions: grant.eligibleRegions,
        eligibleCompanySizes: grant.eligibleCompanySizes,
        status: grant.status,
        deadline: grant.deadline?.toISOString() ?? null,
      },
      {
        atecoCode: profile.atecoCode,
        region: profile.region,
        employeeCount: profile.employeeCount,
      },
    ),
  );
}

export async function getAISemanticMatches(companyUserId: string) {
  const session = await auth();
  if (!session?.user) return [];
  return findSemanticMatches(companyUserId);
}
