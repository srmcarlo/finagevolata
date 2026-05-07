"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportForClickDay } from "@/lib/actions/export";
import { ClickDayStatusBadge } from "./click-day-status-badge";

type ClickDayStatus =
  | "NONE"
  | "REQUESTED"
  | "SENT_TO_PARTNER"
  | "SUBMITTED"
  | "RANKED"
  | "WON"
  | "LOST";

interface Props {
  practiceId: string;
  hasClickDay: boolean;
  clickDayStatus: ClickDayStatus;
  lastExportAt: Date | null;
  documentsAllApproved: boolean;
  pendingDocCount: number;
}

const MAX_NOTES = 500;

export function ClickDaySection({
  practiceId,
  hasClickDay,
  clickDayStatus,
  lastExportAt,
  documentsAllApproved,
  pendingDocCount,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!hasClickDay) return null;

  function submit(currentNotes: string) {
    setError(null);
    startTransition(async () => {
      const result = await exportForClickDay(practiceId, currentNotes);
      if ("error" in result) {
        setError(result.error ?? "Errore sconosciuto");
        return;
      }
      setNotes("");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  const blocker = !documentsAllApproved
    ? `${pendingDocCount} document${pendingDocCount === 1 ? "o" : "i"} non ancora approvat${pendingDocCount === 1 ? "o" : "i"}`
    : null;

  return (
    <section className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Click Day</h2>
        <ClickDayStatusBadge status={clickDayStatus} />
      </div>

      {clickDayStatus === "NONE" ? (
        <div>
          <p className="mb-3 text-sm text-gray-600">
            Quando la pratica è pronta, invia il pacchetto al partner MouseX per il Click Day.
          </p>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Note opzionali per MouseX
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
            rows={3}
            placeholder="Es. priorità alta, fascia oraria preferita…"
            className="mb-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
          <p className="mb-3 text-xs text-gray-400">{notes.length}/{MAX_NOTES}</p>
          <button
            type="button"
            onClick={() => submit(notes)}
            disabled={isPending || !!blocker}
            title={blocker ?? undefined}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Invio…" : "Richiedi Click Day"}
          </button>
          {blocker ? (
            <p className="mt-2 text-xs text-amber-600">{blocker}. Approva tutti i documenti per abilitare l'invio.</p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-gray-700">
            Richiesta inviata a MouseX{lastExportAt ? ` il ${new Date(lastExportAt).toLocaleString("it-IT")}` : ""}.
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Re-invia richiesta
          </button>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      )}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Conferma re-invio</h3>
            <p className="mb-3 text-sm text-gray-600">
              Verrà inviata una nuova email a MouseX con i dati aggiornati della pratica. Continuare?
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Note opzionali
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
              rows={3}
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => submit(notes)}
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Invio…" : "Conferma re-invio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
