import Link from "next/link";
import { getCachedCompanyCounts } from "@/lib/cache/counts";

export async function StatsGrid({ userId }: { userId: string }) {
  const { practiceCount, missingDocs, rejectedDocs } = await getCachedCompanyCounts(userId);

  const cards = [
    { label: "Pratiche attive", value: practiceCount, href: "/azienda/pratiche", color: "text-gray-900" },
    { label: "Documenti mancanti", value: missingDocs, href: "/azienda/documenti-mancanti", color: missingDocs > 0 ? "text-amber-600" : "text-gray-900" },
    { label: "Documenti rifiutati", value: rejectedDocs, href: "/azienda/documenti-rifiutati", color: rejectedDocs > 0 ? "text-red-600" : "text-gray-900" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="rounded-lg border bg-white p-6 transition hover:border-indigo-300 hover:shadow"
        >
          <p className="text-sm text-gray-500">{c.label}</p>
          <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
