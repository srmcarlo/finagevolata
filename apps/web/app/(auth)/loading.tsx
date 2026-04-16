export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="animate-pulse space-y-4 w-full max-w-md px-4">
        <div className="h-8 w-40 mx-auto rounded bg-gray-200" />
        <div className="h-4 w-64 mx-auto rounded bg-gray-200" />
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-300" />
        </div>
      </div>
    </div>
  );
}
