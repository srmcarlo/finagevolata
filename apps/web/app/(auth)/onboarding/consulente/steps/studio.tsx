"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { saveConsultantProfile } from "@/lib/actions/onboarding";

const SPECIALIZATIONS = ["Manifattura", "Servizi", "Agricoltura", "Turismo", "Tech", "Altro"];

export function StudioStep() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    const result = await saveConsultantProfile(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/onboarding/consulente?step=3");
    }
  }

  return (
    <WizardShell
      title="Il tuo studio"
      currentStep={2}
      totalSteps={3}
      labels={["Benvenuto", "Studio", "Primo cliente"]}
    >
      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome studio / freelance</label>
          <input
            name="firmName"
            required
            minLength={2}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Specializzazioni</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALIZATIONS.map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-indigo-300"
              >
                <input type="checkbox" name="specializations" value={s} className="size-4" />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Numero massimo clienti gestibili</label>
          <input
            name="maxClients"
            type="number"
            defaultValue={20}
            min={1}
            max={1000}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">Puoi modificarlo in qualsiasi momento.</p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Continua
        </button>
      </form>
    </WizardShell>
  );
}
