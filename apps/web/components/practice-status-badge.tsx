const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bozza", className: "bg-gray-100 text-gray-700" },
  DOCUMENTS_PENDING: { label: "Documenti in attesa", className: "bg-yellow-100 text-yellow-700" },
  DOCUMENTS_REVIEW: { label: "In revisione", className: "bg-blue-100 text-blue-700" },
  READY: { label: "Pronta", className: "bg-green-100 text-green-700" },
  SUBMITTED: { label: "Inviata", className: "bg-purple-100 text-purple-700" },
  WON: { label: "Vinta", className: "bg-emerald-100 text-emerald-700" },
  LOST: { label: "Persa", className: "bg-red-100 text-red-700" },
};

export function PracticeStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.className}`}>{config.label}</span>;
}
