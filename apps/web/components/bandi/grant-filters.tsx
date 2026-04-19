"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "", label: "Tutti status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Pubblicato" },
  { value: "CLOSED", label: "Chiuso" },
  { value: "EXPIRED", label: "Scaduto" },
];

const APPROVAL = [
  { value: "", label: "Tutti" },
  { value: "pending", label: "Da approvare" },
  { value: "approved", label: "Approvati" },
];

const TYPES = [
  { value: "", label: "Tutti tipi" },
  { value: "FONDO_PERDUTO", label: "Fondo perduto" },
  { value: "FINANZIAMENTO_AGEVOLATO", label: "Finanziamento" },
  { value: "CREDITO_IMPOSTA", label: "Credito imposta" },
  { value: "GARANZIA", label: "Garanzia" },
];

export function GrantFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/bandi?${next.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select value={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)} className={select}>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select value={params.get("approved") ?? ""} onChange={(e) => setParam("approved", e.target.value)} className={select}>
        {APPROVAL.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>
      <select value={params.get("type") ?? ""} onChange={(e) => setParam("type", e.target.value)} className={select}>
        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input
        type="search"
        placeholder="Cerca titolo…"
        defaultValue={params.get("q") ?? ""}
        onBlur={(e) => setParam("q", e.currentTarget.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

const select = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
