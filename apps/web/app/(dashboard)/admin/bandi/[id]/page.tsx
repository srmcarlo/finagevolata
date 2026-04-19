import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { updateGrant } from "@/lib/actions/grants";
import { ApproveButton } from "@/components/bandi/approve-button";
import { RejectDialog } from "@/components/bandi/reject-dialog";
import { PublishButton, DeleteGrantButton } from "@/components/bandi/publish-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBandoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [grant, documentTypes] = await Promise.all([
    prisma.grant.findUnique({
      where: { id },
      include: {
        documentRequirements: { include: { documentType: true }, orderBy: { order: "asc" } },
        createdBy: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!grant) notFound();

  async function action(data: Parameters<typeof updateGrant>[1]) {
    "use server";
    await updateGrant(id, data);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
          <p className="text-sm text-slate-500">
            Status: <strong>{grant.status}</strong> · Approvato:{" "}
            <strong>{grant.approvedByAdmin ? "sì" : "no"}</strong> · Creato da {grant.createdBy.name} ({grant.createdBy.role})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!grant.approvedByAdmin ? (
            <>
              <ApproveButton id={grant.id} />
              <RejectDialog id={grant.id} />
            </>
          ) : null}
          {grant.approvedByAdmin ? <PublishButton id={grant.id} status={grant.status} /> : null}
          <DeleteGrantButton id={grant.id} />
        </div>
      </div>
      <GrantForm
        mode="admin"
        documentTypes={documentTypes}
        initial={{
          ...grant,
          minAmount: grant.minAmount ? Number(grant.minAmount) : null,
          maxAmount: grant.maxAmount ? Number(grant.maxAmount) : null,
          deadline: grant.deadline?.toISOString() ?? null,
          openDate: grant.openDate?.toISOString() ?? null,
          clickDayDate: grant.clickDayDate?.toISOString() ?? null,
          sourceUrl: grant.sourceUrl ?? null,
          documentRequirements: grant.documentRequirements.map((r) => ({
            documentTypeId: r.documentTypeId,
            isRequired: r.isRequired,
            notes: r.notes ?? undefined,
            order: r.order,
          })),
        }}
        onSubmit={action}
        submitLabel="Salva modifiche"
      />
    </div>
  );
}
