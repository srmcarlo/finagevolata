interface StepIndicatorProps {
  current: number;
  total: number;
  labels: string[];
}

export function StepIndicator({ current, total, labels }: StepIndicatorProps) {
  return (
    <ol className="mb-8 flex items-center justify-between gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "upcoming";
        return (
          <li key={n} className="flex flex-1 items-center gap-2">
            <span
              className={
                state === "done"
                  ? "flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
                  : state === "active"
                    ? "flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white ring-4 ring-indigo-200"
                    : "flex size-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-500"
              }
            >
              {state === "done" ? "✓" : n}
            </span>
            <span
              className={
                state === "upcoming"
                  ? "text-sm text-slate-400"
                  : "text-sm font-medium text-slate-700"
              }
            >
              {labels[i]}
            </span>
            {n < total ? <span className="mx-2 h-px flex-1 bg-slate-200" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
