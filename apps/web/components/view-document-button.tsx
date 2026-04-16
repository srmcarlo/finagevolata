"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { getDocumentUrl } from "@/lib/actions/documents";

export function ViewDocumentButton({ docId }: { docId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleView() {
    setIsLoading(true);
    try {
      const res = await getDocumentUrl(docId);
      if (res.url) {
        window.open(res.url, "_blank");
      } else {
        alert("Impossibile caricare il documento: " + res.error);
      }
    } catch (error) {
      alert("Errore di rete");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleView}
      disabled={isLoading}
      title="Visualizza documento"
      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
    </button>
  );
}
