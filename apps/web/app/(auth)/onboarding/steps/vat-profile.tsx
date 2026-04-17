"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITALIAN_REGIONS } from "@finagevolata/shared";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { saveCompanyProfile, lookupVat } from "@/lib/actions/onboarding";

export function VatProfileStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [vat, setVat] = useState("");
  const [prefill, setPrefill] = useState<Record<string, string> | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [error, setError] = useState("");

  async function handleLookup() {
    setLookupError("");
    if (!/^\d{11}$/.test(vat)) {
      setLookupError("P.IVA deve essere 11 cifre.");
      return;
    }
    startTransition(async () => {
      const data = await lookupVat(vat);
      if (!data) {
        setLookupError("Non trovata. Compila manualmente.");
        setPrefill({});
      } else {
        setPrefill(data as unknown as Record<string, string>);
      }
    });
  }

  async function handleSubmit(formData: FormData) {
    formData.set("vatNumber", vat);
    const result = await saveCompanyProfile(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/onboarding?step=3");
    }
  }

  return (
    <WizardShell
      title="Dati aziendali"
      subtitle="Inserisci la P.IVA per auto-compilare, poi controlla i campi."
      currentStep={2}
      totalSteps={3}
      labels={["Benvenuto", "Profilo", "Interessi"]}
    >
      <div className="mb-6 flex gap-2">
        <input
          value={vat}
          onChange={(e) => setVat(e.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="P.IVA (11 cifre)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={pending || vat.length !== 11}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Cerco..." : "Auto-compila"}
        </button>
      </div>

      {lookupError ? <p className="mb-4 text-sm text-amber-700">{lookupError}</p> : null}

      {prefill ? (
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ragione sociale</label>
            <input
              name="companyName"
              required
              defaultValue={prefill.companyName ?? ""}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Forma giuridica</label>
              <select
                name="legalForm"
                required
                defaultValue={prefill.legalForm ?? ""}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Seleziona</option>
                <option value="SRL">SRL</option>
                <option value="SRLS">SRLS</option>
                <option value="SPA">SPA</option>
                <option value="SNC">SNC</option>
                <option value="SAS">SAS</option>
                <option value="DITTA_INDIVIDUALE">Ditta individuale</option>
                <option value="COOPERATIVA">Cooperativa</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dimensione</label>
              <select
                name="employeeCount"
                required
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Seleziona</option>
                <option value="MICRO">Micro (&lt;10)</option>
                <option value="SMALL">Piccola (10-49)</option>
                <option value="MEDIUM">Media (50-249)</option>
                <option value="LARGE">Grande (250+)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Codice ATECO</label>
              <input
                name="atecoCode"
                required
                defaultValue={prefill.atecoCode ?? ""}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Descrizione ATECO</label>
              <input
                name="atecoDescription"
                required
                defaultValue={prefill.atecoDescription ?? ""}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Regione</label>
              <select
                name="region"
                required
                defaultValue={prefill.region ?? ""}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Seleziona</option>
                {ITALIAN_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Provincia</label>
              <input
                name="province"
                required
                maxLength={2}
                defaultValue={prefill.province ?? ""}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Continua
          </button>
        </form>
      ) : null}
    </WizardShell>
  );
}
