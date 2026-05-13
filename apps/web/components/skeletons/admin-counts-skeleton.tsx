export function AdminCountsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 h-8 w-12 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
