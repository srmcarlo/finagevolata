import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { updateGrant } from "@/lib/actions/grants";
import { matchClientsForGrant } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsulenteBandoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [grant, documentTypes] = await Promise.all([
    prisma.grant.findUnique({
      where: { id },
      include: {
        documentRequirements: { include: { documentType: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!grant) notFound();
  if (grant.status !== "PUBLISHED" && grant.createdById !== userId) notFound();

  const canEdit = grant.createdById === userId && !grant.approvedByAdmin;

  async function action(data: Parameters<typeof updateGrant>[1]) {
    "use server";
    await updateGrant(id, data);
  }

  if (canEdit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">{grant.title}</h1>
        <p className="mb-6 text-sm text-slate-500">Bozza in attesa di approvazione — modificabile.</p>
        <GrantForm
          mode="consultant-submit"
          documentTypes={documentTypes}
          initial={{
            ...grant,
            minAmount: grant.minAmount ? Number(grant.minAmount) : null,
            maxAmount: grant.maxAmount ? Number(grant.maxAmount) : null,
            deadline: grant.deadline?.toISOString() ?? null,
            openDate: grant.openDate?.toISOString() ?? null,
            clickDayDate: grant.clickDayDate?.toISOString() ?? null,
            sourceUrl: grant.sourceUrl ?? null,
            documentRequirements: grant.documentRequirements.map((r) => ({
              documentTypeId: r.documentTypeId,
              isRequired: r.isRequired,
              notes: r.notes ?? undefined,
              order: r.order,
            })),
          }}
          onSubmit={action}
          submitLabel="Salva modifiche"
        />
      </div>
    );
  }

  const compatibleClients = userId
    ? await matchClientsForGrant(userId, id).catch(() => [])
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
        <p className="text-sm text-slate-500">{grant.issuingBody}</p>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{grant.description}</p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Documenti richiesti</h2>
        <ul className="space-y-2 text-sm">
          {grant.documentRequirements.map((r) => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium">
                {r.documentType.name} {r.isRequired ? "(obbligatorio)" : "(facoltativo)"}
              </p>
              {r.notes ? <p className="text-xs text-slate-500">{r.notes}</p> : null}
            </li>
          ))}
          {grant.documentRequirements.length === 0 ? <li className="text-slate-500">Nessun documento specificato.</li> : null}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Tuoi clienti compatibili</h2>
        {compatibleClients.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun cliente compatibile con questo bando.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {compatibleClients.map((c) => (
              <li key={c.companyId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{c.companyName}</p>
                  <div className="mt-1">
                    <MatchScoreBadge score={c.score.total} />
                  </div>
                </div>
                {c.hasPractice ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Pratica in corso
                  </span>
                ) : (
                  <Link
                    href={`/consulente/pratiche/new?grantId=${id}&clientId=${c.companyId}`}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Avvia
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {grant.sourceUrl ? (
        <a href={grant.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
          Sito ufficiale →
        </a>
      ) : null}
    </div>
  );
}
