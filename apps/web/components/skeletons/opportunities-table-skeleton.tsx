export function OpportunitiesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-white" aria-hidden="true">
      <div className="bg-slate-50 px-3 py-2">
        <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="border-t px-3 py-3">
          <div className="flex gap-4">
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
