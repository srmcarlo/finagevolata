"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mb-4 text-4xl">⚠</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Qualcosa è andato storto</h2>
        <p className="text-gray-500 mb-6 text-sm">
          {error.message || "Errore nel caricamento della pagina."}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Riprova
          </button>
          <Link
            href="/"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
