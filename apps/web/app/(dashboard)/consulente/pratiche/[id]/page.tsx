import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPractice, updatePracticeStatus } from "@/lib/actions/practices";
import { reviewDocument } from "@/lib/actions/documents";
import { getMessages } from "@/lib/actions/chat";
import { PracticeStatusBadge } from "@/components/practice-status-badge";
import { DocumentChecklist } from "@/components/document-checklist";
import { PracticeTimeline } from "@/components/practice-timeline";
import { PracticeChat } from "@/components/practice-chat";
import { AIDocumentValidator } from "@/components/ai-document-validator";
import { ViewDocumentButton } from "@/components/view-document-button";

const PRACTICE_STATUSES = [
  { value: "DOCUMENTS_PENDING", label: "Documenti in attesa" },
  { value: "DOCUMENTS_REVIEW", label: "In revisione" },
  { value: "READY", label: "Pronta per invio" },
  { value: "SUBMITTED", label: "Inviata" },
  { value: "WON", label: "Vinta" },
  { value: "LOST", label: "Persa" },
];

export default async function ConsultantPracticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [practice, session, messages] = await Promise.all([
    getPractice(id),
    auth(),
    getMessages(id),
  ]);
  if (!practice) notFound();

  const currentUserId = (session?.user as any)?.id;
  const practiceData = practice as any;

  async function handleStatusUpdate(formData: FormData) {
    "use server";
    const status = formData.get("status") as string;
    await updatePracticeStatus(id, status);
    revalidatePath(`/consulente/pratiche/${id}`);
  }

  async function handleReviewDocument(formData: FormData) {
    "use server";
    const docId = formData.get("docId") as string;
    await reviewDocument(docId, formData);
    revalidatePath(`/consulente/pratiche/${id}`);
  }

  const companyName = practiceData.company.companyProfile?.companyName || practiceData.company.name;
  const consultantName = practiceData.consultant.consultantProfile?.firmName || practiceData.consultant.name;
  const uploadedDocs = practiceData.documents.filter((d: any) => d.status === "UPLOADED");

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/consulente/pratiche" className="text-sm text-blue-600 hover:underline">&larr; Pratiche</Link>
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
        </div>
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Azienda</h2>
          <p className="font-medium text-gray-900">{companyName}</p>
          {practiceData.company.companyProfile?.vatNumber && (
            <p className="text-sm text-gray-500 mt-1">P.IVA: {practiceData.company.companyProfile.vatNumber}</p>
          )}
          {practiceData.company.companyProfile?.region && (
            <p className="text-sm text-gray-500 mt-1">Regione: {practiceData.company.companyProfile.region}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">Consulente: {consultantName}</p>
        </div>
      </div>

      {/* Documents to review */}
      {uploadedDocs.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">
            Documenti da revisionare ({uploadedDocs.length})
          </h2>
          <div className="space-y-3">
            {uploadedDocs.map((doc: any) => (
              <div key={doc.id} className="rounded-lg border border-blue-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.documentType.name}</p>
                    {doc.fileName && <p className="text-xs text-gray-500">{doc.fileName} (v{doc.version})</p>}
                    {doc.uploadedAt && <p className="text-xs text-gray-400">Caricato il {new Date(doc.uploadedAt).toLocaleDateString("it-IT")}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.filePath && <ViewDocumentButton docId={doc.id} />}
                    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium">Da revisionare</span>
                  </div>
                </div>
                <form action={handleReviewDocument} className="flex flex-wrap gap-2 items-end">
                  <input type="hidden" name="docId" value={doc.id} />
                  <div className="flex-1 min-w-[200px]">
                    <input name="rejectionReason" type="text" placeholder="Motivo rifiuto (solo se rifiuti)"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button type="submit" name="status" value="APPROVED"
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Approva</button>
                  <button type="submit" name="status" value="REJECTED"
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Rifiuta</button>
                  <AIDocumentValidator docId={doc.id} />
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document checklist */}
      <div className="rounded-lg border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist Documenti</h2>
        {practiceData.documents.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun documento richiesto per questo bando.</p>
        ) : (
          <DocumentChecklist documents={practiceData.documents} />
        )}
      </div>

      {/* Chat & Timeline side by side */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messaggi</h2>
          <PracticeChat practiceId={id} messages={messages as any} currentUserId={currentUserId} />
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attivita</h2>
          <PracticeTimeline practiceId={id} />
        </div>
      </div>

      {/* Status update */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aggiorna Stato Pratica</h2>
        <form action={handleStatusUpdate} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuovo stato</label>
            <select name="status" defaultValue={practiceData.status}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PRACTICE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Salva
          </button>
        </form>
      </div>
    </div>
  );
}
