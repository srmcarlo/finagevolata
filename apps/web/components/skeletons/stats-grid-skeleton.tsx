export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border bg-white p-6">
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 h-8 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
