import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { matchGrantsForCompany, getMatchExplanation } from "@/lib/actions/matching";
import { MatchCard } from "@/components/matching/match-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const consultantId = (session?.user as { id?: string } | undefined)?.id;
  if (!consultantId) redirect("/auth/login");

  const link = await prisma.consultantCompany.findFirst({
    where: { consultantId, companyId: id, status: "ACTIVE" },
    include: { company: { include: { companyProfile: true } } },
  });
  if (!link) notFound();

  const matches = await matchGrantsForCompany(id, { limit: 20 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{link.company.name}</h1>
        <p className="text-sm text-slate-500">
          {link.company.companyProfile?.atecoDescription} —{" "}
          {link.company.companyProfile?.region}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Bandi compatibili</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun bando compatibile per questo cliente.</p>
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
                  href={`/consulente/bandi/${grant.id}?clientId=${id}`}
                  fetchExplanation={async () => {
                    "use server";
                    const r = await getMatchExplanation(id, grant.id);
                    return { paragraph: r.paragraph };
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
