import type { Grant } from "@finagevolata/db";

export function GrantCard({ grant }: { grant: Grant }) {
  const isExpired = grant.deadline && new Date(grant.deadline) < new Date();
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{grant.title}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${grant.status === "PUBLISHED" ? "bg-green-100 text-green-700" : grant.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
          {grant.status === "PUBLISHED" ? "Attivo" : grant.status === "DRAFT" ? "Bozza" : grant.status === "CLOSED" ? "Chiuso" : "Scaduto"}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{grant.issuingBody}</p>
      <p className="text-sm text-gray-700 line-clamp-2 mb-3">{grant.description}</p>
      <div className="flex gap-4 text-xs text-gray-500">
        {grant.maxAmount && <span>Fino a &euro;{Number(grant.maxAmount).toLocaleString("it-IT")}</span>}
        {grant.deadline && <span className={isExpired ? "text-red-500" : ""}>Scadenza: {new Date(grant.deadline).toLocaleDateString("it-IT")}</span>}
        {grant.hasClickDay && <span className="text-blue-600 font-medium">Click Day</span>}
      </div>
    </div>
  );
}
