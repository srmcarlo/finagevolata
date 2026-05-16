"use client";

import { useState } from "react";
import { Brain, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { aiValidateDocument } from "@/lib/actions/documents";

export function AIDocumentValidator({ docId }: { docId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ isValid: boolean; notes: string } | null>(null);

  async function handleAIValidate() {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const res = await aiValidateDocument(docId);
      if (res.success) {
        setSuggestion({ isValid: res.isValid!, notes: res.notes! });
      } else {
        alert(`Errore AI: ${res.error}`);
      }
    } catch {
      alert("Errore di rete o timeout durante l'analisi AI.");
    } finally {
      setIsLoading(false);
    }
  }

  if (suggestion) {
    const ok = suggestion.isValid;
    return (
      <div
        className={`mt-2 p-3 text-sm rounded-md border ${
          ok ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"
        }`}
      >
        <div className="flex items-center gap-2 font-medium mb-1">
          {ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {ok ? "AI suggerisce: approva" : "AI suggerisce: rifiuta"}
        </div>
        <p className="text-xs leading-relaxed">{suggestion.notes}</p>
        <p className="mt-2 text-xs italic opacity-80">
          Il suggerimento e indicativo. Conferma o sovrascrivi con Approva/Rifiuta sopra.
        </p>
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
