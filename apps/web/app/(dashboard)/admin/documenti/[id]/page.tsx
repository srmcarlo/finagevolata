// apps/web/app/(dashboard)/admin/documenti/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DocTypeForm } from "@/components/documenti/doc-type-form";
import { updateDocumentType, deleteDocumentType } from "@/lib/actions/document-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentoEditPage({ params }: PageProps) {
  const { id } = await params;
  const doc = await prisma.documentType.findUnique({ where: { id } });
  if (!doc) notFound();

  async function updateAction(data: Parameters<typeof updateDocumentType>[1]) {
    "use server";
    await updateDocumentType(id, data);
  }

  async function deleteAction() {
    "use server";
    await deleteDocumentType(id);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Modifica documento</h1>
      <DocTypeForm
        initial={{
          slug: doc.slug,
          name: doc.name,
          description: doc.description,
          category: doc.category,
          validityDays: doc.validityDays,
          acceptedFormats: doc.acceptedFormats,
          maxSizeMb: doc.maxSizeMb,
        }}
        onSubmit={updateAction}
        submitLabel="Salva"
        isStandard={doc.isStandard}
      />
      {!doc.isStandard ? (
        <form action={deleteAction} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Elimina
          </button>
        </form>
      ) : null}
    </div>
  );
}
