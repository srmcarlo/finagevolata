export function TopMatchesSkeleton() {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="rounded-lg border bg-white p-4">
          <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}
