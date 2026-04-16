import { getTimeline } from "@/lib/actions/timeline";

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  PRACTICE_CREATED: { icon: "+", color: "bg-blue-500" },
  STATUS_CHANGED: { icon: "~", color: "bg-purple-500" },
  DOCUMENT_UPLOADED: { icon: "^", color: "bg-sky-500" },
  DOCUMENT_APPROVED: { icon: "v", color: "bg-green-500" },
  DOCUMENT_REJECTED: { icon: "x", color: "bg-red-500" },
  MESSAGE_SENT: { icon: "m", color: "bg-gray-400" },
  CLICKDAY_EXPORT: { icon: "!", color: "bg-amber-500" },
};

export async function PracticeTimeline({ practiceId }: { practiceId: string }) {
  const activities = await getTimeline(practiceId);

  if (activities.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">
        Nessuna attivita registrata.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((a) => {
        const config = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.PRACTICE_CREATED;
        const roleLabel = a.actor.role === "CONSULTANT" ? "Consulente" : a.actor.role === "COMPANY" ? "Azienda" : "Admin";
        return (
          <div key={a.id} className="flex gap-3">
            <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${config.color}`}>
              {config.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900">{a.detail}</p>
              <p className="text-xs text-gray-400">
                {a.actor.name} ({roleLabel}) &middot; {new Date(a.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
