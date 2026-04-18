// apps/web/components/documenti/doc-type-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentTypeCreateInput } from "@finagevolata/shared";

const CATEGORIES = [
  { value: "LEGAL", label: "Legale" },
  { value: "FINANCIAL", label: "Finanziario" },
  { value: "FISCAL", label: "Fiscale" },
  { value: "PROJECT", label: "Progetto" },
  { value: "CERTIFICATION", label: "Certificazione" },
] as const;

interface Props {
  initial?: Partial<DocumentTypeCreateInput>;
  onSubmit: (data: DocumentTypeCreateInput) => Promise<unknown>;
  submitLabel: string;
  isStandard?: boolean;
}

export function DocTypeForm({ initial, onSubmit, submitLabel, isStandard }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: DocumentTypeCreateInput = {
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? ""),
      category: fd.get("category") as DocumentTypeCreateInput["category"],
      validityDays: fd.get("validityDays") ? Number(fd.get("validityDays")) : null,
      acceptedFormats: String(fd.get("acceptedFormats") ?? "pdf").split(",").map((s) => s.trim()).filter(Boolean),
      maxSizeMb: Number(fd.get("maxSizeMb") ?? 10),
    };
    startTransition(async () => {
      try {
        await onSubmit(data);
        router.push("/admin/documenti");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      {isStandard ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Documento standard — non eliminabile.
        </p>
      ) : null}
      <Field label="Slug (url-friendly)">
        <input name="slug" defaultValue={initial?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} />
      </Field>
      <Field label="Nome">
        <input name="name" defaultValue={initial?.name} required minLength={2} className={input} />
      </Field>
      <Field label="Descrizione">
        <textarea name="description" defaultValue={initial?.description} required minLength={5} rows={3} className={input} />
      </Field>
      <Field label="Categoria">
        <select name="category" defaultValue={initial?.category ?? "LEGAL"} required className={input}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Validità (giorni) — opzionale">
        <input name="validityDays" type="number" min={1} defaultValue={initial?.validityDays ?? ""} className={input} />
      </Field>
      <Field label="Formati accettati (CSV)">
        <input name="acceptedFormats" defaultValue={(initial?.acceptedFormats ?? ["pdf"]).join(",")} className={input} />
      </Field>
      <Field label="Max size MB">
        <input name="maxSizeMb" type="number" min={1} max={100} defaultValue={initial?.maxSizeMb ?? 10} className={input} />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
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
