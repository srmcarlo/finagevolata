import { Check, X } from "lucide-react";

type Row = { label: string; values: (string | boolean)[] };

const ROWS: Row[] = [
  { label: "Bandi attivi", values: ["1", "Illimitati", "Per cliente", "Per cliente"] },
  { label: "Clienti gestibili", values: [false, false, "Fino a 20", "Illimitati"] },
  { label: "Team members", values: ["1", "1", "1", "Illimitati"] },
  { label: "Click Day add-on", values: [false, true, true, true] },
  { label: "White-label", values: [false, false, false, true] },
  { label: "API access", values: [false, false, false, true] },
  { label: "Storage documenti", values: ["1 GB", "10 GB", "50 GB", "Illimitato"] },
  { label: "Support", values: ["Email", "Email", "Email + Chat", "Priority"] },
];

const HEADERS = ["Free", "Pro Azienda", "Consulente", "Studio"];

export function PricingComparison() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900">
              Confronto piani
            </th>
            {HEADERS.map((h) => (
              <th key={h} className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, idx) => (
            <tr key={row.label} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
              <td className="sticky left-0 bg-inherit px-4 py-3 text-sm font-medium text-slate-700">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="px-4 py-3 text-center text-sm text-slate-700">
                  {v === true ? (
                    <Check className="mx-auto size-4 text-indigo-600" />
                  ) : v === false ? (
                    <X className="mx-auto size-4 text-slate-300" />
                  ) : (
                    v
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
