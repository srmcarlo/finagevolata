import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NotificationsDropdown } from "./notifications-dropdown";

const NAV_ITEMS = {
  CONSULTANT: [
    { label: "Dashboard", href: "/consulente" },
    { label: "Clienti", href: "/consulente/clienti" },
    { label: "Pratiche", href: "/consulente/pratiche" },
    { label: "Bandi", href: "/consulente/bandi" },
    { label: "Profilo", href: "/consulente/profilo" },
  ],
  COMPANY: [
    { label: "Dashboard", href: "/azienda" },
    { label: "Pratiche", href: "/azienda/pratiche" },
    { label: "Bandi Compatibili", href: "/azienda/bandi" },
    { label: "I miei Consulenti", href: "/azienda/inviti", badgeKey: "pendingInvitations" },
    { label: "Profilo Aziendale", href: "/azienda/profilo" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    { label: "Bandi", href: "/admin/bandi" },
    { label: "Utenti", href: "/admin/utenti" },
  ],
} as const;

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as keyof typeof NAV_ITEMS;
  const userId = (session.user as any).id;
  const navItems = NAV_ITEMS[role] || [];

  // Count pending invitations for COMPANY users
  let pendingInvitationCount = 0;
  if (role === "COMPANY") {
    pendingInvitationCount = await prisma.consultantCompany.count({
      where: { companyId: userId, status: "PENDING" },
    });
  }

  const badges: Record<string, number> = {
    pendingInvitations: pendingInvitationCount,
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900">FinAgevolata</h2>
          <p className="text-xs text-gray-500">{session.user.name}</p>
          <p className="text-xs text-gray-400">{role === "ADMIN" ? "Amministratore" : role === "CONSULTANT" ? "Consulente" : "Azienda"}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const badgeCount = ("badgeKey" in item && item.badgeKey) ? badges[item.badgeKey] || 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 transition"
              >
                {item.label}
                {badgeCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
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
