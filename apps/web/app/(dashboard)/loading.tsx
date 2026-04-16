export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-8 space-y-2">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-gray-200" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 p-8 space-y-6">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-gray-200" />
      </main>
    </div>
  );
}
