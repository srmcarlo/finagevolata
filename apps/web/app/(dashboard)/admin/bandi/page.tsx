import { getGrants, approveGrant, createGrant } from "@/lib/actions/grants";
import { revalidatePath } from "next/cache";

const GRANT_TYPE_LABELS: Record<string, string> = {
  FONDO_PERDUTO: "Fondo Perduto",
  FINANZIAMENTO_AGEVOLATO: "Finanziamento Agevolato",
  CREDITO_IMPOSTA: "Credito d'Imposta",
  GARANZIA: "Garanzia",
};

async function handleApprove(formData: FormData) {
  "use server";
  const grantId = formData.get("grantId") as string;
  await approveGrant(grantId);
  revalidatePath("/admin/bandi");
}

async function handleCreate(formData: FormData) {
  "use server";
  await createGrant(formData);
  revalidatePath("/admin/bandi");
}

export default async function AdminGrantsPage() {
  const grants = await getGrants() as any[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestione Bandi</h1>

      {/* Creation Form */}
      <div className="rounded-lg border bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aggiungi Bando</h2>
        <form action={handleCreate} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
            <input
              name="title"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Titolo del bando"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
            <textarea
              name="description"
              required
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrizione del bando"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ente Emittente</label>
            <input
              name="issuingBody"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. MISE, Regione Lombardia"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia</label>
            <select
              name="grantType"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona tipo</option>
              <option value="FONDO_PERDUTO">Fondo Perduto</option>
              <option value="FINANZIAMENTO_AGEVOLATO">Finanziamento Agevolato</option>
              <option value="CREDITO_IMPOSTA">Credito d&apos;Imposta</option>
              <option value="GARANZIA">Garanzia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Importo Massimo (€)</label>
            <input
              name="maxAmount"
              type="number"
              min="0"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. 500000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scadenza</label>
            <input
              name="deadline"
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codici ATECO (separati da virgola)</label>
            <input
              name="eligibleAtecoCodes"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. 62.01, 62.02"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Fonte</label>
            <input
              name="sourceUrl"
              type="url"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://"
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              name="hasClickDay"
              type="checkbox"
              value="true"
              id="hasClickDay"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="hasClickDay" className="text-sm font-medium text-gray-700">Click Day</label>
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Pubblica Bando
            </button>
          </div>
        </form>
      </div>

      {/* Grants Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titolo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipologia</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approvato</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {grants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Nessun bando presente</td>
              </tr>
            )}
            {grants.map((grant) => (
              <tr key={grant.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{grant.title}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{grant.issuingBody}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{GRANT_TYPE_LABELS[grant.grantType] ?? grant.grantType}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${grant.status === "PUBLISHED" ? "bg-green-100 text-green-700" : grant.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                    {grant.status === "PUBLISHED" ? "Pubblicato" : grant.status === "DRAFT" ? "Bozza" : "Chiuso"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${grant.approvedByAdmin ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {grant.approvedByAdmin ? "Si" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!grant.approvedByAdmin && grant.status === "DRAFT" && (
                    <form action={handleApprove}>
                      <input type="hidden" name="grantId" value={grant.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Approva
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
