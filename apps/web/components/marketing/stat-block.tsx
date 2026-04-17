interface StatBlockProps {
  value: string;
  label: string;
  source?: string;
}

export function StatBlock({ value, label, source }: StatBlockProps) {
  return (
    <div className="text-center">
      <div className="text-5xl font-bold tracking-tight text-indigo-600 md:text-6xl">{value}</div>
      <div className="mt-3 text-base font-medium text-slate-900">{label}</div>
      {source ? <div className="mt-1 text-xs text-slate-500">Fonte: {source}</div> : null}
    </div>
  );
}
