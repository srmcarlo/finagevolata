"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewDocument } from "@/lib/actions/documents";

export function DocumentReviewForm({ docId }: { docId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(status: "APPROVED" | "REJECTED") {
    setError(null);
    if (status === "REJECTED" && !reason.trim()) {
      setError("Motivo del rifiuto richiesto");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("status", status);
      fd.append("rejectionReason", reason);
      const res = await reviewDocument(docId, fd);
      if ((res as any)?.error) {
        setError((res as any).error);
        return;
      }
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo rifiuto (solo se rifiuti)"
          disabled={isPending}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={() => submit("APPROVED")}
        disabled={isPending}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? "..." : "Approva"}
      </button>
      <button
        type="button"
        onClick={() => submit("REJECTED")}
        disabled={isPending}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? "..." : "Rifiuta"}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
