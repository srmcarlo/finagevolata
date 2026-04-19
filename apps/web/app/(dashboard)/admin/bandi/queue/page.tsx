import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ApproveButton } from "@/components/bandi/approve-button";
import { RejectDialog } from "@/components/bandi/reject-dialog";

export default async function QueuePage() {
  const pending = await prisma.grant.findMany({
    where: { approvedByAdmin: false, createdBy: { role: "CONSULTANT" } },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Coda approvazioni</h1>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando in coda.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((g) => (
            <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <Link href={`/admin/bandi/${g.id}`} className="text-base font-semibold text-slate-900 hover:underline">
                  {g.title}
                </Link>
                <p className="text-sm text-slate-500">
                  {g.issuingBody} · proposto da {g.createdBy.name} ({g.createdBy.email})
                </p>
              </div>
              <div className="flex gap-2">
                <ApproveButton id={g.id} />
                <RejectDialog id={g.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
