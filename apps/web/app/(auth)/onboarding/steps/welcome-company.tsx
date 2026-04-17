import Link from "next/link";
import { WizardShell } from "@/components/onboarding/wizard-shell";

export function WelcomeCompanyStep() {
  return (
    <WizardShell
      title="Benvenuto in FinAgevolata."
      subtitle="2 minuti per completare il profilo. Poi ti mostriamo i bandi giusti per te."
      currentStep={1}
      totalSteps={3}
      labels={["Benvenuto", "Profilo", "Interessi"]}
    >
      <ul className="space-y-3 text-sm text-slate-700">
        <li className="flex gap-3">
          <span className="text-indigo-600">1.</span>
          Inserisci la P.IVA — auto-compiliamo i dati camerali.
        </li>
        <li className="flex gap-3">
          <span className="text-indigo-600">2.</span>
          Scegli se ricevere avvisi bandi.
        </li>
        <li className="flex gap-3">
          <span className="text-indigo-600">3.</span>
          Entri in dashboard e inizi a caricare documenti.
        </li>
      </ul>
      <Link
        href="/onboarding?step=2"
        className="mt-8 inline-block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Inizia
      </Link>
    </WizardShell>
  );
}
