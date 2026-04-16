"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getTimeline(practiceId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId) return [];

  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice) return [];
  if (role === "CONSULTANT" && practice.consultantId !== userId) return [];
  if (role === "COMPANY" && practice.companyId !== userId) return [];

  return prisma.practiceActivity.findMany({
    where: { practiceId },
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function logActivity(
  practiceId: string,
  actorId: string,
  type: string,
  detail: string
) {
  await prisma.practiceActivity.create({
    data: { practiceId, actorId, type: type as any, detail },
  });
}
