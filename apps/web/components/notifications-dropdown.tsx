import { auth } from "@/lib/auth";
import { getNotifications, getUnreadCount, markAllAsRead } from "@/lib/actions/notifications";
import { NotificationItem } from "./notification-item";

async function handleMarkAllRead(): Promise<void> {
  "use server";
  await markAllAsRead();
}

export async function NotificationsDropdown() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const rolePath = role === "CONSULTANT" ? "consulente" : role === "COMPANY" ? "azienda" : role === "ADMIN" ? "admin" : null;

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(),
    getUnreadCount(),
  ]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Notifiche</span>
        {unreadCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </div>
      {notifications.length > 0 && (
        <div className="mt-2 space-y-2">
          {notifications.slice(0, 5).map((n) => {
            const href = n.practiceId && rolePath ? `/${rolePath}/pratiche/${n.practiceId}` : null;
            return (
              <NotificationItem
                key={n.id}
                id={n.id}
                title={n.title}
                message={n.message}
                isRead={n.isRead}
                createdAt={n.createdAt.toISOString()}
                href={href}
              />
            );
          })}
          {unreadCount > 0 && (
            <form action={handleMarkAllRead}>
              <button type="submit" className="text-xs text-blue-600 hover:underline">
                Segna tutto come letto
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
