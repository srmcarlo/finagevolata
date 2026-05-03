import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrantListCard } from "@/components/bandi/grant-list-card";
import { getMatchScoresForGrants } from "@/lib/actions/matching";
import type { MatchScore } from "@/lib/services/matching";

export default async function AziendaBandiPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  const scores: Map<string, MatchScore> = userId
    ? await getMatchScoresForGrants(userId, grants.map((g) => g.id)).catch(
        () => new Map<string, MatchScore>(),
      )
    : new Map<string, MatchScore>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Bandi disponibili</h1>
      {grants.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando pubblicato al momento.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grants.map((g) => (
            <GrantListCard
              key={g.id}
              grant={g}
              href={`/azienda/bandi/${g.id}`}
              matchScore={scores.get(g.id)?.total}
            />
          ))}
        </div>
      )}
    </div>
  );
}
