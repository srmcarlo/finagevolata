import { cn } from "@/lib/utils";

export function MatchScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 70
      ? "bg-green-100 text-green-800"
      : score >= 40
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      {score}% match
    </span>
  );
}
