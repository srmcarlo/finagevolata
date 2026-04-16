"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  badge?: number;
}

interface SidebarNavProps {
  userName: string;
  roleLabel: string;
  navItems: NavItem[];
  signOutAction: () => Promise<void>;
  notificationsSlot: React.ReactNode;
}

export function SidebarNav({ userName, roleLabel, navItems, signOutAction, notificationsSlot }: SidebarNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900">FinAgevolata</h2>
        <p className="text-xs text-gray-500">{userName}</p>
        <p className="text-xs text-gray-400">{roleLabel}</p>
      </div>
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {item.label}
              {item.badge && item.badge > 0 ? (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t pt-4">
        {notificationsSlot}
      </div>
      <form action={signOutAction} className="mt-4">
        <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
          Esci
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r bg-gray-50 p-4 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile: hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white border shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Apri menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile: overlay backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile: slide-in sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-gray-50 border-r p-4 flex flex-col transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-200"
          onClick={() => setOpen(false)}
          aria-label="Chiudi menu"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
