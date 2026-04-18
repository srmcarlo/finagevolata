// apps/web/app/(dashboard)/admin/documenti/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DocTypeForm } from "@/components/documenti/doc-type-form";
import { createDocumentType } from "@/lib/actions/document-types";

export default async function DocumentiPage() {
  const items = await prisma.documentType.findMany({
    orderBy: [{ isStandard: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tipi di documento</h1>
      </div>
      <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="p-3">Nome</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Validità</th>
              <th className="p-3">Standard</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-t border-slate-200 text-sm">
                <td className="p-3 font-medium text-slate-900">{d.name}</td>
                <td className="p-3 font-mono text-xs text-slate-600">{d.slug}</td>
                <td className="p-3">{d.category}</td>
                <td className="p-3">{d.validityDays ? `${d.validityDays} gg` : "—"}</td>
                <td className="p-3">{d.isStandard ? "Sì" : "No"}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/documenti/${d.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                    Modifica
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Aggiungi tipo documento</h2>
      <DocTypeForm onSubmit={createDocumentType} submitLabel="Crea" />
    </div>
  );
}
