"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] md:hidden">
      <Link
        href="/register?plan=free"
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Inizia gratis <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/contatti"
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Demo
      </Link>
    </div>
  );
}
