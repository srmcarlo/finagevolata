import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GrantListCard } from "@/components/bandi/grant-list-card";

export default async function ConsulenteBandiPage() {
  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bandi</h1>
        <Link href="/consulente/bandi/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Proponi bando
        </Link>
      </div>
      {grants.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando pubblicato.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grants.map((g) => (
            <GrantListCard key={g.id} grant={g} href={`/consulente/bandi/${g.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
