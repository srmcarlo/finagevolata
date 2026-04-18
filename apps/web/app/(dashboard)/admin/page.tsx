import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const [totalGrants, pendingGrants, totalDocTypes] = await Promise.all([
    prisma.grant.count(),
    prisma.grant.count({
      where: { approvedByAdmin: false, createdBy: { role: "CONSULTANT" } },
    }),
    prisma.documentType.count(),
  ]);

  const cards = [
    { label: "Bandi totali", value: totalGrants, href: "/admin/bandi" },
    { label: "Da approvare", value: pendingGrants, href: "/admin/bandi/queue" },
    { label: "Tipi documento", value: totalDocTypes, href: "/admin/documenti" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard Admin</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow"
          >
            <p className="text-sm font-medium text-slate-500">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
