"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveGrant } from "@/lib/actions/grants";

export function ApproveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await approveGrant(id);
          router.refresh();
        })
      }
      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {pending ? "…" : "Approva"}
    </button>
  );
}
