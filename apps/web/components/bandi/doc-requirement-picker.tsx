// apps/web/components/bandi/doc-requirement-picker.tsx
"use client";

import { useState } from "react";
import type { DocumentType } from "@finagevolata/db";

export interface PickedRequirement {
  documentTypeId: string;
  isRequired: boolean;
  notes?: string;
  order: number;
}

interface Props {
  documentTypes: DocumentType[];
  initial?: PickedRequirement[];
  onChange: (items: PickedRequirement[]) => void;
}

export function DocRequirementPicker({ documentTypes, initial, onChange }: Props) {
  const [items, setItems] = useState<PickedRequirement[]>(initial ?? []);

  function update(next: PickedRequirement[]) {
    setItems(next);
    onChange(next);
  }

  function toggle(id: string) {
    const existing = items.find((i) => i.documentTypeId === id);
    if (existing) {
      update(items.filter((i) => i.documentTypeId !== id));
    } else {
      update([...items, { documentTypeId: id, isRequired: true, order: items.length }]);
    }
  }

  function setField<K extends keyof PickedRequirement>(
    id: string,
    key: K,
    value: PickedRequirement[K],
  ) {
    update(items.map((i) => (i.documentTypeId === id ? { ...i, [key]: value } : i)));
  }

  function reorder(id: string, direction: -1 | 1) {
    const idx = items.findIndex((i) => i.documentTypeId === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    update(next.map((i, order) => ({ ...i, order })));
  }

  const selectedIds = new Set(items.map((i) => i.documentTypeId));
  const available = documentTypes.filter((dt) => !selectedIds.has(dt.id));

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Documenti richiesti</p>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun documento selezionato.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, idx) => {
              const dt = documentTypes.find((d) => d.id === item.documentTypeId);
              if (!dt) return null;
              return (
                <li key={item.documentTypeId} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{dt.name}</p>
                      <p className="text-xs text-slate-500">{dt.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={item.isRequired}
                          onChange={(e) => setField(item.documentTypeId, "isRequired", e.target.checked)}
                        />
                        Obbligatorio
                      </label>
                      <button type="button" onClick={() => reorder(item.documentTypeId, -1)} disabled={idx === 0} className="rounded px-2 text-slate-600 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => reorder(item.documentTypeId, 1)} disabled={idx === items.length - 1} className="rounded px-2 text-slate-600 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => toggle(item.documentTypeId)} className="rounded px-2 text-red-600">✕</button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Note (opzionali)"
                    defaultValue={item.notes ?? ""}
                    onChange={(e) => setField(item.documentTypeId, "notes", e.target.value)}
                    className="mt-2 block w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {available.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Aggiungi documento</p>
          <div className="flex flex-wrap gap-2">
            {available.map((dt) => (
              <button
                key={dt.id}
                type="button"
                onClick={() => toggle(dt.id)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                + {dt.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
