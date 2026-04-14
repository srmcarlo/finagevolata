import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsDropdown } from "./notifications-dropdown";

const NAV_ITEMS = {
  CONSULTANT: [
    { label: "Dashboard", href: "/consulente" },
    { label: "Clienti", href: "/consulente/clienti" },
    { label: "Pratiche", href: "/consulente/pratiche" },
    { label: "Bandi", href: "/consulente/bandi" },
  ],
  COMPANY: [
    { label: "Dashboard", href: "/azienda" },
    { label: "Pratiche", href: "/azienda/pratiche" },
    { label: "Bandi", href: "/azienda/bandi" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    { label: "Bandi", href: "/admin/bandi" },
    { label: "Utenti", href: "/admin/utenti" },
  ],
};

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as keyof typeof NAV_ITEMS;
  const navItems = NAV_ITEMS[role] || [];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900">FinAgevolata</h2>
          <p className="text-xs text-gray-500">{session.user.name}</p>
          <p className="text-xs text-gray-400 capitalize">{role.toLowerCase()}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t pt-4">
          <NotificationsDropdown />
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-auto pt-4"
        >
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
            Esci
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
