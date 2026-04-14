import { getGrants, createGrant } from "@/lib/actions/grants";
import { GrantCard } from "@/components/grant-card";
import { revalidatePath } from "next/cache";

async function handleCreate(formData: FormData) {
  "use server";
  await createGrant(formData);
  revalidatePath("/consulente/bandi");
}

export default async function ConsultantGrantsPage() {
  const grants = await getGrants() as any[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bandi Disponibili</h1>

      {/* Creation Form */}
      <div className="rounded-lg border bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Proponi Nuovo Bando</h2>
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
              Proponi Bando (Bozza)
            </button>
          </div>
        </form>
      </div>

      {/* Grants List */}
      {grants.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun bando disponibile.</p>
      ) : (
        <div className="grid gap-4">
          {grants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}
