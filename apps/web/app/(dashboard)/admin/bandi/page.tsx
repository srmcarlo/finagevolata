import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@finagevolata/db";
import { GrantFilters } from "@/components/bandi/grant-filters";

interface PageProps {
  searchParams: Promise<{ status?: string; approved?: string; type?: string; q?: string }>;
}

export default async function AdminBandiPage({ searchParams }: PageProps) {
  const { status, approved, type, q } = await searchParams;
  const where: Prisma.GrantWhereInput = {};
  if (status) where.status = status as any;
  if (approved === "pending") where.approvedByAdmin = false;
  if (approved === "approved") where.approvedByAdmin = true;
  if (type) where.grantType = type as any;
  if (q) where.title = { contains: q, mode: "insensitive" };

  const grants = await prisma.grant.findMany({
    where,
    include: { createdBy: { select: { name: true, role: true } }, _count: { select: { documentRequirements: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bandi</h1>
        <Link href="/admin/bandi/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Nuovo bando
        </Link>
      </div>
      <GrantFilters />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-3">Titolo</th>
              <th className="p-3">Ente</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Status</th>
              <th className="p-3">Approvato</th>
              <th className="p-3">Creato da</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {grants.map((g) => (
              <tr key={g.id} className="border-t border-slate-200 text-sm">
                <td className="p-3 font-medium text-slate-900">{g.title}</td>
                <td className="p-3">{g.issuingBody}</td>
                <td className="p-3">{g.grantType}</td>
                <td className="p-3">{g.status}</td>
                <td className="p-3">{g.approvedByAdmin ? "✓" : "—"}</td>
                <td className="p-3 text-slate-600">{g.createdBy.name} ({g.createdBy.role})</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/bandi/${g.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                    Apri
                  </Link>
                </td>
              </tr>
            ))}
            {grants.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-sm text-slate-500">Nessun bando.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
