"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishGrant, closeGrant, deleteGrant } from "@/lib/actions/grants";

export function PublishButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (status === "PUBLISHED") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await closeGrant(id); router.refresh(); })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "…" : "Chiudi"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await publishGrant(id); router.refresh(); })}
      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {pending ? "…" : "Pubblica"}
    </button>
  );
}

export function DeleteGrantButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Eliminare definitivamente il bando?")) return;
        start(async () => { await deleteGrant(id); router.push("/admin/bandi"); });
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      Elimina
    </button>
  );
}
