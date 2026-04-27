export function MatchSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-4">
      <div className="h-4 w-2/3 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-20 rounded-full bg-slate-200" />
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
