export function TimelineSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-2 w-2 mt-2 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="mt-2 h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
