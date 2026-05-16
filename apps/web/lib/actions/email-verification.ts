"use server";

import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationCodeEmail } from "@/lib/email";

const CODE_TTL_MIN = 15;
const RESEND_COOLDOWN_S = 60;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function issueVerificationCode(
  userId: string
): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "Utente non trovato" };
  if (user.emailVerified) return { success: false, error: "Email gia verificata" };

  const last = await prisma.emailVerificationToken.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (last) {
    const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_S) {
      return {
        success: false,
        error: "Attendi prima di richiedere un nuovo codice",
        cooldownRemaining: Math.ceil(RESEND_COOLDOWN_S - elapsed),
      };
    }
    await prisma.emailVerificationToken.update({
      where: { id: last.id },
      data: { consumedAt: new Date() },
    });
  }

  const code = generateCode();
  const codeHash = await hash(code, 10);
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60 * 1000),
    },
  });

  // TEMP — useful while Resend testing tier blocks real delivery. Remove after domain verified.
  console.log(`[email-verification] Code for user ${userId}: ${code}`);

  await sendVerificationCodeEmail({
    to: user.email,
    name: user.name,
    code,
  }).catch((e) => console.error("[email-verification] send failed:", e));

  return { success: true };
}

export async function verifyEmailCode({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{6}$/.test(code)) return { success: false, error: "Codice non valido" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: "Email non trovata" };
  if (user.emailVerified) return { success: false, error: "Email gia verificata" };

  const token = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!token) return { success: false, error: "Nessun codice attivo. Richiedi un nuovo codice." };
  if (token.expiresAt < new Date()) return { success: false, error: "Codice scaduto. Richiedi un nuovo codice." };
  if (token.attempts >= MAX_ATTEMPTS) return { success: false, error: "Troppi tentativi. Richiedi un nuovo codice." };

  const ok = await compare(code, token.codeHash);
  if (!ok) {
    await prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, error: "Codice errato" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  return { success: true };
}

export async function resendVerificationCode(
  email: string
): Promise<{ success: boolean; error?: string; cooldownRemaining?: number }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: false, error: "Email non trovata" };
  return issueVerificationCode(user.id);
}
