"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function sendMessage(practiceId: string, content: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId) return { error: "Non autorizzato" };

  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) return { error: "Pratica non trovata" };
  if (role === "CONSULTANT" && practice.consultantId !== userId) return { error: "Non autorizzato" };
  if (role === "COMPANY" && practice.companyId !== userId) return { error: "Non autorizzato" };

  if (!content.trim()) return { error: "Messaggio vuoto" };

  await prisma.$transaction([
    prisma.practiceMessage.create({
      data: { practiceId, senderId: userId, content: content.trim() },
    }),
    prisma.practiceActivity.create({
      data: {
        practiceId,
        actorId: userId,
        type: "MESSAGE_SENT",
        detail: `Ha inviato un messaggio`,
      },
    }),
  ]);

  return { success: true };
}

export async function getMessages(practiceId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId) return [];

  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) return [];
  if (role === "CONSULTANT" && practice.consultantId !== userId) return [];
  if (role === "COMPANY" && practice.companyId !== userId) return [];

  return prisma.practiceMessage.findMany({
    where: { practiceId },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
}
