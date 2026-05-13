import Link from "next/link";
import { getCachedTopMatches } from "@/lib/cache/matches";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { MatchChips } from "@/components/matching/match-chips";

export async function TopMatches({ userId }: { userId: string }) {
  const topMatches = await getCachedTopMatches(userId, 5).catch(() => []);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Bandi consigliati per te</h2>
        <Link href="/azienda/bandi/consigliati" className="text-sm text-blue-600 hover:underline">
          Vedi tutti
        </Link>
      </div>
      {topMatches.length === 0 ? (
        <p className="text-sm text-slate-500">
          Completa il profilo per vedere i bandi piu adatti.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topMatches.map(({ grant, score }) => (
            <li key={grant.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/azienda/bandi/${grant.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {grant.title}
                </Link>
                <MatchScoreBadge score={score.total} />
              </div>
              <p className="text-xs text-slate-500">{grant.issuingBody}</p>
              <div className="mt-2">
                <MatchChips chips={score.chips.slice(0, 3)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
