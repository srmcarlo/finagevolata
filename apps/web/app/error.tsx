"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="it">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Errore imprevisto</h1>
            <p className="text-gray-500 mb-6">
              Si è verificato un errore tecnico. Riprova o contatta il supporto se il problema persiste.
            </p>
            {error.digest && (
              <p className="text-xs text-gray-400 mb-4 font-mono">ID: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
