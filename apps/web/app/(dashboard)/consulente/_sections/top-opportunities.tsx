import Link from "next/link";
import { getTopOpportunitiesForConsultant } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";

export async function TopOpportunities({ userId }: { userId: string }) {
  const opportunities = await getTopOpportunitiesForConsultant(userId, 10).catch(() => []);

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Top opportunita clienti</h2>
      {opportunities.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nessuna opportunita rilevante. Aggiungi clienti o aspetta nuovi bandi.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Bando</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={`${o.companyId}-${o.grant.id}`} className="border-t">
                  <td className="px-3 py-2 font-medium">{o.companyName}</td>
                  <td className="px-3 py-2">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/consulente/bandi/${o.grant.id}?clientId=${o.companyId}`}
                    >
                      {o.grant.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <MatchScoreBadge score={o.score.total} />
                  </td>
                  <td className="px-3 py-2">
                    {o.grant.deadline
                      ? new Date(o.grant.deadline).toLocaleDateString("it-IT")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
