import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPractice } from "@/lib/actions/practices";
import { getMessages } from "@/lib/actions/chat";
import { PracticeStatusBadge } from "@/components/practice-status-badge";
import { DocumentChecklist } from "@/components/document-checklist";
import { PracticeTimeline } from "@/components/practice-timeline";
import { PracticeChat } from "@/components/practice-chat";
import { DocumentUploadSection } from "./document-upload-section";
import { AIAssistant } from "@/components/ai-assistant";

export default async function AziendaPracticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [practice, session, messages] = await Promise.all([
    getPractice(id),
    auth(),
    getMessages(id),
  ]);
  if (!practice) notFound();

  const currentUserId = (session?.user as any)?.id;
  const practiceData = practice as any;

  const companyName = practiceData.company.companyProfile?.companyName || practiceData.company.name;
  const consultantName = practiceData.consultant.consultantProfile?.firmName || practiceData.consultant.name;

  const missingOrRejected = practiceData.documents.filter(
    (d: any) => d.status === "MISSING" || d.status === "REJECTED"
  );

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/azienda/pratiche" className="text-sm text-blue-600 hover:underline">&larr; Pratiche</Link>
        <h1 className="text-2xl font-bold text-gray-900">{practiceData.grant.title}</h1>
        <PracticeStatusBadge status={practiceData.status} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bando</h2>
          <p className="font-medium text-gray-900">{practiceData.grant.title}</p>
          <p className="text-sm text-gray-500 mt-1">{practiceData.grant.issuingBody}</p>
          {practiceData.grant.deadline && (
            <p className="text-sm text-gray-500 mt-1">Scadenza: {new Date(practiceData.grant.deadline).toLocaleDateString("it-IT")}</p>
          )}
          {practiceData.grant.maxAmount && (
            <p className="text-sm text-gray-500 mt-1">Importo max: {Number(practiceData.grant.maxAmount).toLocaleString("it-IT")} &euro;</p>
          )}
          {practiceData.grant.sourceUrl && (
            <a href={practiceData.grant.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-2 inline-block">Scheda ufficiale</a>
          )}
        </div>
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Il tuo Consulente</h2>
          <p className="font-medium text-gray-900">{consultantName}</p>
          <p className="text-sm text-gray-500 mt-1">{practiceData.consultant.email}</p>
          <p className="text-sm text-gray-500 mt-3">Azienda: {companyName}</p>
        </div>
      </div>

      {/* Document checklist */}
      <div className="rounded-lg border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist Documenti</h2>
        {practiceData.documents.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun documento richiesto per questo bando.</p>
        ) : (
          <DocumentChecklist documents={practiceData.documents} />
        )}
      </div>

      {/* Upload section */}
      {missingOrRejected.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Documenti da caricare</h2>
          <p className="text-sm text-amber-700 mb-4">
            Hai {missingOrRejected.length} document{missingOrRejected.length === 1 ? "o" : "i"} da caricare o correggere.
          </p>
          <DocumentUploadSection documents={missingOrRejected} practiceId={id} />
        </div>
      )}

      {/* Chat & Timeline side by side */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messaggi con il Consulente</h2>
          <PracticeChat practiceId={id} messages={messages as any} currentUserId={currentUserId} />
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attivita</h2>
          <PracticeTimeline practiceId={id} />
        </div>
      </div>

      <AIAssistant 
        practiceId={id} 
        grantTitle={practiceData.grant.title} 
      />
    </div>
  );
}
