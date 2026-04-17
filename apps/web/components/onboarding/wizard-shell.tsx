import { StepIndicator } from "./step-indicator";

interface WizardShellProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  labels: string[];
  children: React.ReactNode;
}

export function WizardShell({
  title,
  subtitle,
  currentStep,
  totalSteps,
  labels,
  children,
}: WizardShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-white px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <StepIndicator current={currentStep} total={totalSteps} labels={labels} />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
