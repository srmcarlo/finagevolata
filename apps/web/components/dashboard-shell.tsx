import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NotificationsDropdown } from "./notifications-dropdown";
import { SidebarNav } from "./sidebar-nav";

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
    { label: "I miei Consulenti", href: "/azienda/inviti", badgeKey: "pendingInvitations" as const },
    { label: "Profilo Aziendale", href: "/azienda/profilo" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    { label: "Bandi", href: "/admin/bandi" },
    { label: "Utenti", href: "/admin/utenti" },
  ],
} as const;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Amministratore",
  CONSULTANT: "Consulente",
  COMPANY: "Azienda",
};

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as keyof typeof NAV_ITEMS;
  const userId = (session.user as any).id;
  const rawNavItems = NAV_ITEMS[role] || [];

  // Count pending invitations for COMPANY users
  let pendingInvitationCount = 0;
  if (role === "COMPANY") {
    pendingInvitationCount = await prisma.consultantCompany.count({
      where: { companyId: userId, status: "PENDING" },
    });
  }

  const navItems = rawNavItems.map((item) => ({
    label: item.label,
    href: item.href,
    badge: "badgeKey" in item ? pendingInvitationCount : undefined,
  }));

  async function handleSignOut(): Promise<void> {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav
        userName={session.user.name ?? ""}
        roleLabel={ROLE_LABELS[role] ?? role}
        navItems={navItems}
        signOutAction={handleSignOut}
        notificationsSlot={<NotificationsDropdown />}
      />
      <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
