"use client";

import { useState } from "react";
import { Brain, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { aiValidateDocument } from "@/lib/actions/documents";

export function AIDocumentValidator({ docId }: { docId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ status: string; notes: string } | null>(null);

  async function handleAIValidate() {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await aiValidateDocument(docId);
      if (res.success) {
        setResult({ status: res.status!, notes: res.notes! });
      } else {
        alert(`Errore AI: ${res.error}`);
      }
    } catch (error) {
      alert("Errore di rete o timeout durante l'analisi AI.");
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    const isApproved = result.status === "APPROVED";
    return (
      <div className={`mt-2 p-3 text-sm rounded-md border ${isApproved ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
        <div className="flex items-center gap-2 font-medium mb-1">
          {isApproved ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {isApproved ? "Documento approvato dall'AI" : "Problemi rilevati dall'AI"}
        </div>
        <p className="text-xs leading-relaxed">{result.notes}</p>
      </div>
    );
  }

  return (
    <button
      onClick={handleAIValidate}
      disabled={isLoading}
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors shadow-sm ml-2"
    >
      {isLoading ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Analisi con Gemini...
        </>
      ) : (
        <>
          <Brain size={14} />
          Verifica con AI
        </>
      )}
    </button>
  );
}
