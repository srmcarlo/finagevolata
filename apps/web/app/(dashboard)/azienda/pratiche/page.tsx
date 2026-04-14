import Link from "next/link";
import { getPractices } from "@/lib/actions/practices";
import { PracticeStatusBadge } from "@/components/practice-status-badge";

export default async function AziendaPratichePage() {
  const practices = await getPractices() as any[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Le mie Pratiche</h1>

      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Bando</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ente</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stato</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Documenti</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Consulente</th>
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
                  <td className="px-4 py-3 text-sm text-gray-500">{p.grant.issuingBody}</td>
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
                    {p.consultant.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/azienda/pratiche/${p.id}`}
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
                  Nessuna pratica attiva. Il tuo consulente aprirà una pratica per te.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
