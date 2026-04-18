// apps/web/lib/actions/grants.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  grantCreateSchema,
  grantUpdateSchema,
  type GrantCreateInput,
  type GrantUpdateInput,
} from "@finagevolata/shared";
import {
  sendGrantSubmittedEmail,
  sendGrantRejectedEmail,
} from "@/lib/email";

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
  revalidatePath(`/admin/bandi/${id}`);
  revalidatePath("/admin/bandi");
}
