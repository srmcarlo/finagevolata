import { getNotifications, getUnreadCount, markAllAsRead } from "@/lib/actions/notifications";

export async function NotificationsDropdown() {
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
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} className={`rounded-lg border p-3 text-sm ${n.isRead ? "bg-white" : "bg-blue-50 border-blue-200"}`}>
              <p className="font-medium text-gray-900">{n.title}</p>
              <p className="text-gray-500">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString("it-IT")}</p>
            </div>
          ))}
          {unreadCount > 0 && (
            <form action={markAllAsRead}>
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
