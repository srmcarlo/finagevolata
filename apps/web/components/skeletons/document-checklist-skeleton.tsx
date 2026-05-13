export function DocumentChecklistSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border bg-white p-3">
          <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 flex-1 rounded bg-gray-200 animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
