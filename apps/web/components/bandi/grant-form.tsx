// apps/web/components/bandi/grant-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentType } from "@finagevolata/db";
import type { GrantCreateInput } from "@finagevolata/shared";
import { DocRequirementPicker, type PickedRequirement } from "./doc-requirement-picker";

const GRANT_TYPES = [
  { value: "FONDO_PERDUTO", label: "Fondo perduto" },
  { value: "FINANZIAMENTO_AGEVOLATO", label: "Finanziamento agevolato" },
  { value: "CREDITO_IMPOSTA", label: "Credito d'imposta" },
  { value: "GARANZIA", label: "Garanzia" },
] as const;

const COMPANY_SIZES = [
  { value: "MICRO", label: "Micro" },
  { value: "SMALL", label: "Piccola" },
  { value: "MEDIUM", label: "Media" },
  { value: "LARGE", label: "Grande" },
] as const;

const ITALIAN_REGIONS = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
  "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto",
];

export interface GrantFormValues extends GrantCreateInput {}

interface Props {
  initial?: Partial<GrantFormValues> & { id?: string };
  mode: "admin" | "consultant-submit";
  documentTypes: DocumentType[];
  onSubmit: (data: GrantFormValues) => Promise<unknown>;
  submitLabel: string;
}

export function GrantForm({ initial, mode, documentTypes, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [hasClickDay, setHasClickDay] = useState(initial?.hasClickDay ?? false);
  const [requirements, setRequirements] = useState<PickedRequirement[]>(
    (initial?.documentRequirements ?? []).map((r, i) => ({
      documentTypeId: r.documentTypeId,
      isRequired: r.isRequired ?? true,
      notes: r.notes,
      order: r.order ?? i,
    })),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const selectedRegions = ITALIAN_REGIONS.filter((r) => fd.get(`region_${r}`) === "on");
    const selectedSizes = COMPANY_SIZES.filter((s) => fd.get(`size_${s.value}`) === "on").map((s) => s.value);
    const ateco = String(fd.get("eligibleAtecoCodes") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const data: GrantFormValues = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      issuingBody: String(fd.get("issuingBody") ?? ""),
      grantType: fd.get("grantType") as GrantFormValues["grantType"],
      minAmount: fd.get("minAmount") ? Number(fd.get("minAmount")) : null,
      maxAmount: fd.get("maxAmount") ? Number(fd.get("maxAmount")) : null,
      deadline: (fd.get("deadline") ? new Date(String(fd.get("deadline"))).toISOString() : null) as any,
      openDate: (fd.get("openDate") ? new Date(String(fd.get("openDate"))).toISOString() : null) as any,
      hasClickDay,
      clickDayDate: (hasClickDay && fd.get("clickDayDate")
        ? new Date(String(fd.get("clickDayDate"))).toISOString()
        : null) as any,
      eligibleAtecoCodes: ateco,
      eligibleRegions: selectedRegions,
      eligibleCompanySizes: selectedSizes as GrantFormValues["eligibleCompanySizes"],
      sourceUrl: String(fd.get("sourceUrl") ?? "") || null,
      documentRequirements: requirements,
    };

    startTransition(async () => {
      try {
        await onSubmit(data);
        router.push(mode === "admin" ? "/admin/bandi" : "/consulente/bandi");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Informazioni base">
        <Field label="Titolo"><input name="title" defaultValue={initial?.title} required minLength={5} maxLength={200} className={input} /></Field>
        <Field label="Ente emittente"><input name="issuingBody" defaultValue={initial?.issuingBody} required minLength={2} className={input} /></Field>
        <Field label="Tipo">
          <select name="grantType" defaultValue={initial?.grantType ?? "FONDO_PERDUTO"} required className={input}>
            {GRANT_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="URL ufficiale (opz.)"><input name="sourceUrl" type="url" defaultValue={initial?.sourceUrl ?? ""} className={input} /></Field>
        <Field label="Descrizione"><textarea name="description" defaultValue={initial?.description} required minLength={20} maxLength={5000} rows={6} className={input} /></Field>
      </Section>

      <Section title="Importi e scadenze">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min (EUR)"><input name="minAmount" type="number" min={0} defaultValue={initial?.minAmount ?? ""} className={input} /></Field>
          <Field label="Max (EUR)"><input name="maxAmount" type="number" min={0} defaultValue={initial?.maxAmount ?? ""} className={input} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data apertura"><input name="openDate" type="date" defaultValue={initial?.openDate ? String(initial.openDate).slice(0, 10) : ""} className={input} /></Field>
          <Field label="Scadenza"><input name="deadline" type="date" defaultValue={initial?.deadline ? String(initial.deadline).slice(0, 10) : ""} className={input} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasClickDay} onChange={(e) => setHasClickDay(e.target.checked)} />
          Click Day
        </label>
        {hasClickDay ? (
          <Field label="Data Click Day"><input name="clickDayDate" type="datetime-local" defaultValue={initial?.clickDayDate ? String(initial.clickDayDate).slice(0, 16) : ""} required className={input} /></Field>
        ) : null}
      </Section>

      <Section title="Eligibilità">
        <Field label="Codici ATECO (separati da virgole)"><input name="eligibleAtecoCodes" defaultValue={(initial?.eligibleAtecoCodes ?? []).join(", ")} className={input} placeholder="62.01, 62.02" /></Field>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Regioni</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {ITALIAN_REGIONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-xs">
                <input type="checkbox" name={`region_${r}`} defaultChecked={initial?.eligibleRegions?.includes(r) ?? false} />
                {r}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Dimensione impresa</p>
          <div className="flex flex-wrap gap-3">
            {COMPANY_SIZES.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`size_${s.value}`} defaultChecked={initial?.eligibleCompanySizes?.includes(s.value) ?? false} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Documenti richiesti">
        <DocRequirementPicker
          documentTypes={documentTypes}
          initial={requirements}
          onChange={setRequirements}
        />
      </Section>

      {mode === "consultant-submit" ? (
        <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-800">
          Il bando sarà inviato agli amministratori per approvazione prima di essere pubblicato.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Salvataggio…" : submitLabel}
      </button>
    </form>
  );
}

const input = "block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
