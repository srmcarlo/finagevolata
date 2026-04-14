import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPractice, updatePracticeStatus } from "@/lib/actions/practices";
import { PracticeStatusBadge } from "@/components/practice-status-badge";
import { DocumentChecklist } from "@/components/document-checklist";

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
  const practice = await getPractice(id) as any;
  if (!practice) notFound();

  async function handleStatusUpdate(formData: FormData) {
    "use server";
    const status = formData.get("status") as string;
    await updatePracticeStatus(id, status);
    revalidatePath(`/consulente/pratiche/${id}`);
  }

  const companyName = practice.company.companyProfile?.companyName || practice.company.name;
  const consultantName = practice.consultant.consultantProfile?.fullName || practice.consultant.name;

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
        </div>

        {/* Company info */}
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Azienda</h2>
          <p className="font-medium text-gray-900">{companyName}</p>
          {practice.company.companyProfile?.vatNumber && (
            <p className="text-sm text-gray-500 mt-1">P.IVA: {practice.company.companyProfile.vatNumber}</p>
          )}
          {practice.company.companyProfile?.region && (
            <p className="text-sm text-gray-500 mt-1">Regione: {practice.company.companyProfile.region}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">Consulente: {consultantName}</p>
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

      {/* Status update */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aggiorna Stato Pratica</h2>
        <form action={handleStatusUpdate} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuovo stato</label>
            <select
              name="status"
              defaultValue={practice.status}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRACTICE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Salva
          </button>
        </form>
      </div>
    </div>
  );
}
