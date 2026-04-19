import Link from "next/link";
import type { Grant } from "@finagevolata/db";

interface Props {
  grant: Grant;
  href: string;
}

export function GrantListCard({ grant, href }: Props) {
  const daysLeft = grant.deadline
    ? Math.ceil((grant.deadline.getTime() - Date.now()) / 86400_000)
    : null;
  const urgency =
    daysLeft != null && daysLeft >= 0 && daysLeft < 7
      ? "bg-red-100 text-red-800"
      : daysLeft != null && daysLeft < 30
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
          {grant.grantType.replace(/_/g, " ")}
        </span>
        {grant.hasClickDay ? (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
            Click Day
          </span>
        ) : null}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900">{grant.title}</h3>
      <p className="mb-3 text-xs text-slate-500">{grant.issuingBody}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">
          {grant.minAmount != null && grant.maxAmount != null
            ? `${fmt(Number(grant.minAmount))} – ${fmt(Number(grant.maxAmount))}`
            : grant.maxAmount != null
            ? `fino a ${fmt(Number(grant.maxAmount))}`
            : "importo non specificato"}
        </span>
        {daysLeft != null ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgency}`}>
            {daysLeft < 0 ? "Scaduto" : `${daysLeft} gg`}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M EUR`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k EUR`;
  return `${n} EUR`;
}
