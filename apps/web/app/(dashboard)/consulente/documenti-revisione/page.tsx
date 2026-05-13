import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ViewDocumentButton } from "@/components/view-document-button";
import { DocumentReviewForm } from "@/components/document-review-form";
import { AIDocumentValidator } from "@/components/ai-document-validator";

export default async function DocumentiRevisionePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const docs = await prisma.practiceDocument.findMany({
    where: { practice: { consultantId: userId }, status: "UPLOADED" },
    include: {
      documentType: true,
      practice: {
        include: {
          grant: { select: { title: true } },
          company: { include: { companyProfile: { select: { companyName: true } } } },
        },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/consulente" className="text-sm text-blue-600 hover:underline">&larr; Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900">Documenti da revisionare</h1>
        <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium">{docs.length}</span>
      </div>

      {docs.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-sm text-gray-500">
          Nessun documento in attesa di revisione.
        </p>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => {
            const companyName = doc.practice.company.companyProfile?.companyName || doc.practice.company.name;
            return (
              <div key={doc.id} className="rounded-lg border border-blue-200 bg-white p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.documentType.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {companyName} —{" "}
                      <Link
                        href={`/consulente/pratiche/${doc.practiceId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {doc.practice.grant.title}
                      </Link>
                    </p>
                    {doc.fileName && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {doc.fileName} (v{doc.version})
                        {doc.uploadedAt && ` — caricato il ${new Date(doc.uploadedAt).toLocaleDateString("it-IT")}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {doc.filePath && <ViewDocumentButton docId={doc.id} />}
                    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium whitespace-nowrap">
                      Da revisionare
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <DocumentReviewForm docId={doc.id} />
                  <AIDocumentValidator docId={doc.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
