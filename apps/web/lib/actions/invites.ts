"use server";

import crypto from "crypto";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendClientInviteEmail } from "@/lib/email";
import { createInviteSchema, acceptInviteSchema } from "@finagevolata/shared";

const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;
const HOURLY_LIMIT = 10;

export async function createClientInvite(input: unknown): Promise<{ ok: true }> {
  const parsed = createInviteSchema.parse(input);

  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  if (!user?.id || user.role !== "CONSULTANT") {
    throw new Error("Non autorizzato");
  }

  const recentCount = await prisma.clientInvite.count({
    where: {
      consultantId: user.id,
      createdAt: { gte: new Date(Date.now() - 3600_000) },
    },
  });
  if (recentCount >= HOURLY_LIMIT) {
    throw new Error("Limite invio inviti superato. Riprova tra un'ora.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.clientInvite.create({
    data: {
      consultantId: user.id,
      email: parsed.email,
      token,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://axentraitalia.cloud";
  await sendClientInviteEmail({
    to: parsed.email,
    consultantName: user.name ?? "Un consulente",
    link: `${baseUrl}/invite/${token}`,
  });

  return { ok: true };
}

export async function acceptInvite(input: unknown): Promise<{ ok: true }> {
  const parsed = acceptInviteSchema.parse(input);

  const invite = await prisma.clientInvite.findUnique({ where: { token: parsed.token } });
  if (!invite) throw new Error("Invito non valido.");
  if (invite.status === "ACCEPTED") throw new Error("Invito già utilizzato.");
  if (invite.status === "REVOKED") throw new Error("Invito revocato.");
  if (invite.expiresAt.getTime() < Date.now()) throw new Error("Invito scaduto.");

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) throw new Error("Email già registrata. Accedi invece.");

  const hashed = await hash(parsed.password, 12);

  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: invite.email,
        name: parsed.name,
        password: hashed,
        role: "COMPANY",
        plan: "FREE",
      },
    });
    await tx.consultantCompany.create({
      data: {
        consultantId: invite.consultantId,
        companyId: newUser.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });
    await tx.clientInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: newUser.id,
      },
    });
  });

  return { ok: true };
}
