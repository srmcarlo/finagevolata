export function ChatSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div className="h-12 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
