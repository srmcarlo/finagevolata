import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTopMatchesForDashboard } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { MatchChips } from "@/components/matching/match-chips";

export default async function CompanyDashboard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  // Redirect to onboarding if profile not completed
  const profile = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");

  const [practiceCount, missingDocs, rejectedDocs, pendingInvitations, topMatches] =
    await Promise.all([
      prisma.practice.count({ where: { companyId: userId } }),
      prisma.practiceDocument.count({
        where: { practice: { companyId: userId }, status: "MISSING" },
      }),
      prisma.practiceDocument.count({
        where: { practice: { companyId: userId }, status: "REJECTED" },
      }),
      prisma.consultantCompany.findMany({
        where: { companyId: userId, status: "PENDING" },
        include: { consultant: { include: { consultantProfile: true } } },
      }),
      getTopMatchesForDashboard(userId, 5).catch(() => []),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Azienda</h1>

      {/* Banner inviti in attesa */}
      {pendingInvitations.length > 0 && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-blue-800">
                Hai {pendingInvitations.length} invit{pendingInvitations.length === 1 ? "o" : "i"} in attesa
              </h2>
              <div className="mt-2 space-y-1">
                {pendingInvitations.map((inv) => (
                  <p key={inv.id} className="text-sm text-blue-700">
                    <span className="font-medium">
                      {inv.consultant.consultantProfile?.firmName || inv.consultant.name}
                    </span>{" "}
                    ({inv.consultant.email}) ti ha invitato a collaborare
                  </p>
                ))}
              </div>
            </div>
            <Link
              href="/azienda/inviti"
              className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Rispondi agli inviti
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Pratiche attive</p>
          <p className="text-3xl font-bold">{practiceCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Documenti mancanti</p>
          <p className="text-3xl font-bold text-amber-600">{missingDocs}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Documenti rifiutati</p>
          <p className="text-3xl font-bold text-red-600">{rejectedDocs}</p>
        </div>
      </div>

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
    </div>
  );
}
