import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getPractices, createPractice } from "@/lib/actions/practices";
import { getGrants } from "@/lib/actions/grants";
import { getMyClients } from "@/lib/actions/companies";
import { PracticeStatusBadge } from "@/components/practice-status-badge";

async function handleCreate(formData: FormData) {
  "use server";
  await createPractice(formData);
  revalidatePath("/consulente/pratiche");
}

export default async function ConsultantPratichePage() {
  const [practices, grants, clients] = await Promise.all([
    getPractices() as Promise<any[]>,
    getGrants() as Promise<any[]>,
    getMyClients() as Promise<any[]>,
  ]);

  const publishedGrants = grants.filter((g) => g.status === "PUBLISHED");
  const activeClients = clients.filter((c) => c.status === "ACTIVE");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pratiche</h1>

      {/* New practice form */}
      <div className="rounded-lg border bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuova Pratica</h2>
        {publishedGrants.length === 0 || activeClients.length === 0 ? (
          <p className="text-sm text-gray-500">
            {publishedGrants.length === 0
              ? "Nessun bando pubblicato disponibile."
              : "Nessun cliente attivo. Invita un'azienda dalla sezione Clienti."}
          </p>
        ) : (
          <form action={handleCreate} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bando</label>
              <select
                name="grantId"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona bando</option>
                {publishedGrants.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select
                name="companyId"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona azienda</option>
                {activeClients.map((c) => (
                  <option key={c.companyId} value={c.companyId}>
                    {c.company.companyProfile?.companyName || c.company.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Crea Pratica
            </button>
          </form>
        )}
      </div>

      {/* Practices table */}
      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Bando</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azienda</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stato</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Documenti</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Creata</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {practices.map((p) => {
              const approved = p.documents.filter((d: any) => d.status === "APPROVED").length;
              const total = p._count.documents;
              return (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.grant.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.company.companyProfile?.companyName || p.company.name}
                  </td>
                  <td className="px-4 py-3">
                    <PracticeStatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${total > 0 ? (approved / total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{approved}/{total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/consulente/pratiche/${p.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Dettaglio
                    </Link>
                  </td>
                </tr>
              );
            })}
            {practices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nessuna pratica ancora. Crea la prima pratica in alto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
