import { notFound } from "next/navigation";
import { getPractice } from "@/lib/actions/practices";
import { PracticeStatusBadge } from "@/components/practice-status-badge";
import { DocumentChecklist } from "@/components/document-checklist";

export default async function AziendaPracticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const practice = await getPractice(id) as any;
  if (!practice) notFound();

  const companyName = practice.company.companyProfile?.companyName || practice.company.name;
  const consultantName = practice.consultant.consultantProfile?.fullName || practice.consultant.name;

  const missingOrRejected = practice.documents.filter(
    (d: any) => d.status === "MISSING" || d.status === "REJECTED"
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{practice.grant.title}</h1>
        <PracticeStatusBadge status={practice.status} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Grant info */}
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bando</h2>
          <p className="font-medium text-gray-900">{practice.grant.title}</p>
          <p className="text-sm text-gray-500 mt-1">{practice.grant.issuingBody}</p>
          {practice.grant.deadline && (
            <p className="text-sm text-gray-500 mt-1">
              Scadenza: {new Date(practice.grant.deadline).toLocaleDateString("it-IT")}
            </p>
          )}
          {practice.grant.maxAmount && (
            <p className="text-sm text-gray-500 mt-1">
              Importo max: {practice.grant.maxAmount.toLocaleString("it-IT")} €
            </p>
          )}
          {practice.grant.sourceUrl && (
            <a
              href={practice.grant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-2 inline-block"
            >
              Scheda ufficiale
            </a>
          )}
        </div>

        {/* Consultant info */}
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Il tuo Consulente</h2>
          <p className="font-medium text-gray-900">{consultantName}</p>
          <p className="text-sm text-gray-500 mt-1">{practice.consultant.email}</p>
          <p className="text-sm text-gray-500 mt-3">Azienda: {companyName}</p>
        </div>
      </div>

      {/* Document checklist */}
      <div className="rounded-lg border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist Documenti</h2>
        {practice.documents.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun documento richiesto per questo bando.</p>
        ) : (
          <DocumentChecklist documents={practice.documents} />
        )}
      </div>

      {/* Action required notice */}
      {missingOrRejected.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-2">Azione richiesta</h2>
          <p className="text-sm text-amber-700">
            Hai {missingOrRejected.length} document{missingOrRejected.length === 1 ? "o" : "i"} da caricare o correggere.
            La funzione di upload documenti sarà disponibile a breve.
          </p>
          <ul className="mt-3 space-y-1">
            {missingOrRejected.map((d: any) => (
              <li key={d.id} className="text-sm text-amber-700">
                &bull; {d.documentType.name}
                {d.status === "REJECTED" && d.rejectionReason && (
                  <span className="text-red-600"> — {d.rejectionReason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
