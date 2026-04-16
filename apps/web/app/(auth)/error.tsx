"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AuthError({
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Errore di autenticazione</h2>
        <p className="text-gray-500 mb-6 text-sm">
          {error.message || "Si è verificato un errore. Riprova ad accedere."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Riprova
          </button>
          <Link
            href="/login"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
