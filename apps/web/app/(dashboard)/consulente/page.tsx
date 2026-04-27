import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getTopOpportunitiesForConsultant } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";

export default async function ConsultantDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";

  const [clientCount, practiceCount, pendingDocs, opportunities] = await Promise.all([
    prisma.consultantCompany.count({ where: { consultantId: userId, status: "ACTIVE" } }),
    prisma.practice.count({ where: { consultantId: userId } }),
    prisma.practiceDocument.count({
      where: {
        practice: { consultantId: userId },
        status: "UPLOADED",
      },
    }),
    userId ? getTopOpportunitiesForConsultant(userId, 10).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Consulente</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Clienti attivi</p>
          <p className="text-3xl font-bold">{clientCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Pratiche</p>
          <p className="text-3xl font-bold">{practiceCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Documenti da revisionare</p>
          <p className="text-3xl font-bold">{pendingDocs}</p>
        </div>
      </div>

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
    </div>
  );
}
