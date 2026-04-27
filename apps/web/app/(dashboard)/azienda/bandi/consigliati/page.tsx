import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { matchGrantsForCompany, getMatchExplanation } from "@/lib/actions/matching";
import { MatchCard } from "@/components/matching/match-card";

export default async function ConsigliatiPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth/login");

  const matches = await matchGrantsForCompany(userId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Bandi consigliati per te</h1>
        <p className="text-sm text-slate-500">Ordinati per affinita con il tuo profilo.</p>
      </header>

      {matches.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nessun bando compatibile trovato. Verifica regione e codice ATECO sul tuo profilo.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {matches.map(({ grant, score }) => (
            <li key={grant.id}>
              <MatchCard
                grant={{
                  id: grant.id,
                  title: grant.title,
                  issuingBody: grant.issuingBody,
                  maxAmount: grant.maxAmount == null ? null : Number(grant.maxAmount),
                  deadline: grant.deadline,
                }}
                score={score}
                href={`/azienda/bandi/${grant.id}`}
                fetchExplanation={async () => {
                  "use server";
                  const r = await getMatchExplanation(userId, grant.id);
                  return { paragraph: r.paragraph };
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
