// apps/web/components/ai-assistant.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Bot, User, Send, X, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";

function getTextFromParts(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");
}

export function AIAssistant({ practiceId, grantTitle }: { practiceId: string; grantTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localInput, setLocalInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialMessages: UIMessage[] = [
    {
      id: "welcome",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: `Ciao! Sono il tuo assistente AI per il bando "${grantTitle}". Chiedimi qualsiasi cosa sui requisiti, documenti necessari o scadenze.`,
        },
      ],
    },
  ];

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { practiceId },
    }),
    messages: initialMessages,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll ai nuovi messaggi
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = localInput.trim();
    if (!text || isLoading) return;
    setLocalInput("");
    await sendMessage({ text });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center gap-2"
      >
        <MessageSquare size={20} />
        <span className="font-medium">Chiedi all&apos;AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-xl shadow-2xl border flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-bold">Assistente Bando</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-500 p-1 rounded">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const text = getTextFromParts(m.parts as Array<{ type: string; text?: string }>);
          return (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role !== "user" && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Bot size={18} />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {text}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                  <User size={18} />
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Bot size={18} className="animate-pulse" />
            </div>
            <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-400">
              Sto analizzando il bando...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-4 border-t bg-gray-50 flex gap-2">
        <input
          value={localInput}
          onChange={(e) => setLocalInput(e.target.value)}
          placeholder="Fai una domanda sul bando..."
          className="flex-1 bg-white border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !localInput.trim()}
          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
