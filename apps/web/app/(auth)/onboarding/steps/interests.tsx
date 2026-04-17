import { WizardShell } from "@/components/onboarding/wizard-shell";
import { saveInterests } from "@/lib/actions/onboarding";

export function InterestsStep() {
  return (
    <WizardShell
      title="Ultimo passaggio"
      subtitle="Vuoi ricevere un'email quando esce un bando compatibile col tuo profilo?"
      currentStep={3}
      totalSteps={3}
      labels={["Benvenuto", "Profilo", "Interessi"]}
    >
      <form action={saveInterests} className="space-y-6">
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-indigo-300">
          <input type="checkbox" name="subscribe" defaultChecked className="mt-1 size-4" />
          <div>
            <div className="font-medium text-slate-900">Notifiche bandi</div>
            <div className="text-sm text-slate-600">
              Ti avvisiamo via email quando esce un bando compatibile con il tuo codice ATECO e la tua
              regione.
            </div>
          </div>
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Finisci e vai alla dashboard
        </button>
      </form>
    </WizardShell>
  );
}
