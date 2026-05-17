"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/lib/actions/chat";

interface Message {
  id: string;
  content: string;
  createdAt: Date;
  sender: { id: string; name: string; role: string };
}

export function PracticeChat({
  practiceId,
  messages,
  currentUserId,
}: {
  practiceId: string;
  messages: Message[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [content]);

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    const result = await sendMessage(practiceId, trimmed);
    if (!result.error) {
      setContent("");
      startTransition(() => router.refresh());
      textareaRef.current?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div>
      <div ref={scrollRef} className="space-y-3 max-h-80 overflow-y-auto mb-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Nessun messaggio. Scrivi per iniziare la conversazione.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender.id === currentUserId;
          const roleLabel = msg.sender.role === "CONSULTANT" ? "Consulente" : "Azienda";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2 ${isMe ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                {!isMe && (
                  <p className="text-xs font-medium mb-1 text-gray-500">{msg.sender.name} ({roleLabel})</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio... (Shift+Enter per andare a capo)"
          rows={1}
          className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "..." : "Invia"}
        </button>
      </form>
    </div>
  );
}
