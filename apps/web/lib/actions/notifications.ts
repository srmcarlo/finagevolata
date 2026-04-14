"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  practiceId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type as any,
      title: data.title,
      message: data.message,
      practiceId: data.practiceId,
    },
  });
}

export async function getNotifications() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return [];

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadCount() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return 0;

  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(notificationId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  return { success: true };
}

export async function markAllAsRead() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { success: true };
}
