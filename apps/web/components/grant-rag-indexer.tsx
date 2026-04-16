// apps/web/components/grant-rag-indexer.tsx
"use client";

import { useState } from "react";
import { Brain, Check, Loader2, Info } from "lucide-react";
import { indexGrantText } from "@/lib/actions/rag";

export function GrantRagIndexer({ grantId, grantTitle }: { grantId: string; grantTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleIndex() {
    if (!text.trim()) return;
    setIsLoading(true);
    setMessage(null);
    
    try {
      const result = await indexGrantText(grantId, text);
      if (result.success) {
        setMessage({ type: "success", text: result.message || "Bando indicizzato!" });
        setText("");
      } else {
        setMessage({ type: "error", text: result.error || "Errore durante l'indicizzazione." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Errore di connessione." });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition"
      >
        <Brain size={12} />
        Indicizza AI
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Indicizzazione AI RAG</h3>
              <p className="text-xs text-gray-500 uppercase font-medium tracking-wider">{grantTitle}</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
            <Check size={24} />
          </button>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start mb-4 border border-blue-100">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Incolla qui il testo integrale del bando (requisiti, spese ammissibili, scadenze). 
            L&apos;AI lo suddividerà in frammenti per rispondere correttamente alle domande dell&apos;azienda nel chatbot.
          </p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Incolla qui il testo ufficiale del bando..."
          className="w-full h-80 rounded-lg border border-gray-300 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
        />

        {message && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Annulla
          </button>
          <button
            onClick={handleIndex}
            disabled={isLoading || !text.trim()}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Indicizzazione...
              </>
            ) : (
              "Avvia Ingestion AI"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
