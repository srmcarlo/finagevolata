import Link from "next/link";
import { WizardShell } from "@/components/onboarding/wizard-shell";

export function WelcomeConsultantStep() {
  return (
    <WizardShell
      title="Benvenuto, consulente."
      subtitle="Configura lo studio e invita il primo cliente. Ti facciamo risparmiare 10 ore di email."
      currentStep={1}
      totalSteps={3}
      labels={["Benvenuto", "Studio", "Primo cliente"]}
    >
      <ul className="space-y-3 text-sm text-slate-700">
        <li className="flex gap-3">
          <span className="text-indigo-600">1.</span>
          Dati dello studio — nome, specializzazioni, capacità.
        </li>
        <li className="flex gap-3">
          <span className="text-indigo-600">2.</span>
          Invita il primo cliente via email.
        </li>
        <li className="flex gap-3">
          <span className="text-indigo-600">3.</span>
          Entri in dashboard con tutto pronto.
        </li>
      </ul>
      <Link
        href="/onboarding/consulente?step=2"
        className="mt-8 inline-block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Inizia
      </Link>
    </WizardShell>
  );
}
