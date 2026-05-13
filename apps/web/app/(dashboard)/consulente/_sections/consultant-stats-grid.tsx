import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function ConsultantStatsGrid({ userId }: { userId: string }) {
  const [clientCount, practiceCount, pendingDocs] = await Promise.all([
    prisma.consultantCompany.count({ where: { consultantId: userId, status: "ACTIVE" } }),
    prisma.practice.count({ where: { consultantId: userId } }),
    prisma.practiceDocument.count({
      where: { practice: { consultantId: userId }, status: "UPLOADED" },
    }),
  ]);

  const cards = [
    { label: "Clienti attivi", value: clientCount, href: "/consulente/clienti", color: "text-gray-900" },
    { label: "Pratiche", value: practiceCount, href: "/consulente/pratiche", color: "text-gray-900" },
    { label: "Documenti da revisionare", value: pendingDocs, href: "/consulente/documenti-revisione", color: pendingDocs > 0 ? "text-blue-600" : "text-gray-900" },
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
