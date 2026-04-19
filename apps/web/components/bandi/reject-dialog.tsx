"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rejectGrant } from "@/lib/actions/grants";

export function RejectDialog({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await rejectGrant(id, reason);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Rifiuta
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Rifiuta bando</h3>
            <textarea
              required
              minLength={3}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo del rifiuto (visibile al consulente)…"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm">Annulla</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                {pending ? "Rifiuto…" : "Conferma rifiuto"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
