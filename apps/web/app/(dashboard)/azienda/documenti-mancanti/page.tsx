import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentUploadSection } from "../pratiche/[id]/document-upload-section";

export default async function DocumentiMancantiPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const docs = await prisma.practiceDocument.findMany({
    where: { practice: { companyId: userId }, status: "MISSING" },
    include: {
      documentType: { select: { name: true, slug: true, acceptedFormats: true, maxSizeMb: true } },
      practice: {
        select: {
          id: true,
          grant: { select: { title: true, deadline: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/azienda" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900">Documenti mancanti</h1>
        <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-medium">{docs.length}</span>
      </div>

      {docs.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-sm text-gray-500">
          Nessun documento mancante. Tutte le pratiche sono in regola.
        </p>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2">
                <p className="text-xs text-amber-700">
                  <Link
                    href={`/azienda/pratiche/${doc.practiceId}`}
                    className="hover:underline"
                  >
                    {doc.practice.grant.title}
                  </Link>
                  {doc.practice.grant.deadline && (
                    <span className="text-amber-600">
                      {" "}— scadenza {new Date(doc.practice.grant.deadline).toLocaleDateString("it-IT")}
                    </span>
                  )}
                </p>
              </div>
              <DocumentUploadSection
                documents={[
                  {
                    id: doc.id,
                    status: doc.status,
                    rejectionReason: doc.rejectionReason,
                    documentType: doc.documentType,
                  },
                ]}
                practiceId={doc.practiceId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
