"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markAsRead } from "@/lib/actions/notifications";

export function NotificationItem({
  id,
  title,
  message,
  isRead,
  createdAt,
  href,
}: {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  href: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!href && isRead) return;
    startTransition(async () => {
      if (!isRead) await markAsRead(id);
      if (href) router.push(href);
      else router.refresh();
    });
  }

  const clickable = href || !isRead;
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : -1}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`rounded-lg border p-3 text-sm transition ${
        isRead ? "bg-white" : "bg-blue-50 border-blue-200"
      } ${clickable ? "cursor-pointer hover:bg-blue-100" : ""} ${isPending ? "opacity-60" : ""}`}
    >
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-gray-500">{message}</p>
      <p className="mt-1 text-xs text-gray-400">
        {new Date(createdAt).toLocaleDateString("it-IT")}
      </p>
    </div>
  );
}
