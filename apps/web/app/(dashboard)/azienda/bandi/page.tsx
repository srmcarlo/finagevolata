import { prisma } from "@/lib/prisma";
import { GrantListCard } from "@/components/bandi/grant-list-card";

export default async function AziendaBandiPage() {
  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Bandi disponibili</h1>
      {grants.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando pubblicato al momento.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grants.map((g) => (
            <GrantListCard key={g.id} grant={g} href={`/azienda/bandi/${g.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
