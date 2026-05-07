type ClickDayStatus =
  | "NONE"
  | "REQUESTED"
  | "SENT_TO_PARTNER"
  | "SUBMITTED"
  | "RANKED"
  | "WON"
  | "LOST";

const STYLES: Record<ClickDayStatus, { bg: string; text: string; label: string }> = {
  NONE: { bg: "bg-gray-100", text: "text-gray-700", label: "Non richiesto" },
  REQUESTED: { bg: "bg-blue-100", text: "text-blue-700", label: "Inviato a MouseX" },
  SENT_TO_PARTNER: { bg: "bg-indigo-100", text: "text-indigo-700", label: "In carico MouseX" },
  SUBMITTED: { bg: "bg-violet-100", text: "text-violet-700", label: "Inviato" },
  RANKED: { bg: "bg-yellow-100", text: "text-yellow-800", label: "In graduatoria" },
  WON: { bg: "bg-green-100", text: "text-green-700", label: "Vinto" },
  LOST: { bg: "bg-red-100", text: "text-red-700", label: "Perso" },
};

export function ClickDayStatusBadge({ status }: { status: ClickDayStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}
