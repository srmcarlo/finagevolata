import { getMyClients, inviteCompany } from "@/lib/actions/companies";

export default async function ClientiPage() {
  const clients = await getMyClients();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">I miei clienti</h1>
      </div>

      <div className="rounded-lg border bg-white p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Invita un&apos;azienda</h2>
        <form action={inviteCompany} className="flex gap-3">
          <input name="companyEmail" type="email" required placeholder="email@azienda.it"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700">
            Invita
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azienda</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">P.IVA</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Regione</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stato</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-4 py-3 text-sm">{c.company.companyProfile?.companyName || c.company.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.company.companyProfile?.vatNumber || "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.company.companyProfile?.region || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    c.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    c.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {c.status === "ACTIVE" ? "Attivo" : c.status === "PENDING" ? "In attesa" : "Revocato"}
                  </span>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nessun cliente ancora. Invita la prima azienda!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
