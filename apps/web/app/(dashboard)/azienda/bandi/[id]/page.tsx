import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AziendaBandoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const grant = await prisma.grant.findUnique({
    where: { id },
    include: {
      documentRequirements: { include: { documentType: true }, orderBy: { order: "asc" } },
    },
  });
  if (!grant || grant.status !== "PUBLISHED" || !grant.approvedByAdmin) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
        <p className="text-sm text-slate-500">
          {grant.issuingBody} · {grant.grantType.replace(/_/g, " ")}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <Info label="Importo min" value={grant.minAmount != null ? `${Number(grant.minAmount)} EUR` : "—"} />
        <Info label="Importo max" value={grant.maxAmount != null ? `${Number(grant.maxAmount)} EUR` : "—"} />
        <Info label="Apertura" value={grant.openDate ? grant.openDate.toLocaleDateString("it-IT") : "—"} />
        <Info label="Scadenza" value={grant.deadline ? grant.deadline.toLocaleDateString("it-IT") : "—"} />
        {grant.hasClickDay ? <Info label="Click Day" value={grant.clickDayDate ? grant.clickDayDate.toLocaleString("it-IT") : "—"} /> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Descrizione</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{grant.description}</p>
      </section>

      {grant.eligibleAtecoCodes.length + grant.eligibleRegions.length + grant.eligibleCompanySizes.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Eligibilità</h2>
          {grant.eligibleAtecoCodes.length > 0 ? <ChipRow label="ATECO" items={grant.eligibleAtecoCodes} /> : null}
          {grant.eligibleRegions.length > 0 ? <ChipRow label="Regioni" items={grant.eligibleRegions} /> : null}
          {grant.eligibleCompanySizes.length > 0 ? <ChipRow label="Dimensione" items={grant.eligibleCompanySizes} /> : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Documenti richiesti</h2>
        <ul className="space-y-2 text-sm">
          {grant.documentRequirements.map((r) => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium">
                {r.documentType.name} {r.isRequired ? "(obbligatorio)" : "(facoltativo)"}
              </p>
              <p className="text-xs text-slate-500">{r.documentType.category}</p>
              {r.notes ? <p className="mt-1 text-xs text-slate-600">Note: {r.notes}</p> : null}
            </li>
          ))}
          {grant.documentRequirements.length === 0 ? <li className="text-slate-500">Nessun documento specificato.</li> : null}
        </ul>
      </section>

      {grant.sourceUrl ? (
        <a href={grant.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
          Sito ufficiale →
        </a>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{it}</span>
        ))}
      </div>
    </div>
  );
}
