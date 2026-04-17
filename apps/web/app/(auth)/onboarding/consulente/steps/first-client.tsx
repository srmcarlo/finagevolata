"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { createClientInvite } from "@/lib/actions/invites";
import { finishConsultantOnboarding } from "@/lib/actions/onboarding";

export function FirstClientStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function handleInvite() {
    setError("");
    startTransition(async () => {
      try {
        await createClientInvite({ email });
        setSent(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  async function handleSkip() {
    await finishConsultantOnboarding();
  }

  return (
    <WizardShell
      title="Invita il primo cliente"
      subtitle="Un'email + un link: il cliente crea l'account e vi collega automaticamente."
      currentStep={3}
      totalSteps={3}
      labels={["Benvenuto", "Studio", "Primo cliente"]}
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-emerald-900">Invito inviato a {email}.</h3>
          <p className="mt-2 text-sm text-emerald-800">Scade tra 7 giorni.</p>
          <button
            onClick={() => router.push("/consulente")}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Vai alla dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@cliente.it"
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={handleInvite}
            disabled={pending || !email}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Invio..." : "Invia invito"}
          </button>
          <form action={handleSkip}>
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Salta per ora
            </button>
          </form>
        </div>
      )}
    </WizardShell>
  );
}
