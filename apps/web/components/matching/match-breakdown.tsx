import type { MatchScoreBreakdown } from "@/lib/services/matching";

export function MatchBreakdown({
  breakdown,
  semanticScore,
}: {
  breakdown: MatchScoreBreakdown;
  semanticScore: number;
}) {
  const rows = [
    { label: "ATECO", value: breakdown.ateco, max: 30 },
    { label: "Dimensione", value: breakdown.size, max: 25 },
    { label: "Importo", value: breakdown.amount, max: 20 },
    { label: "Deadline", value: breakdown.deadline, max: 15 },
    { label: "Approvato admin", value: breakdown.approval, max: 10 },
    { label: "Affinita semantica", value: semanticScore, max: 100 },
  ];
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b last:border-0">
            <td className="py-1.5 text-slate-600">{r.label}</td>
            <td className="py-1.5 text-right tabular-nums text-slate-900">
              {r.value}/{r.max}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
