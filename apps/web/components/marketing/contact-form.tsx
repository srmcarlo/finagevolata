"use client";

import { useState, useTransition } from "react";
import { submitContact } from "@/app/(marketing)/contatti/actions";

interface ContactFormProps {
  defaultPlan?: string;
}

export function ContactForm({ defaultPlan }: ContactFormProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    setStatus("idle");
    setErrorMsg("");
    startTransition(async () => {
      try {
        await submitContact({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          role: String(formData.get("role") ?? ""),
          message: String(formData.get("message") ?? ""),
          plan: (formData.get("plan") as string) || undefined,
        });
        setStatus("ok");
      } catch (err: unknown) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Errore sconosciuto");
      }
    });
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h3 className="text-xl font-bold text-emerald-900">Grazie!</h3>
        <p className="mt-2 text-sm text-emerald-800">
          Messaggio ricevuto. Ti rispondiamo entro 1 giorno lavorativo.
        </p>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      {defaultPlan ? <input type="hidden" name="plan" value={defaultPlan} /> : null}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Nome e cognome</label>
        <input
          id="name" name="name" type="text" required minLength={2} maxLength={100}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          id="email" name="email" type="email" required
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">Sono un...</label>
        <select
          id="role" name="role" required defaultValue=""
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="" disabled>Seleziona...</option>
          <option value="consulente">Consulente di finanza agevolata</option>
          <option value="azienda">Azienda / PMI</option>
          <option value="altro">Altro</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Messaggio</label>
        <textarea
          id="message" name="message" required minLength={10} maxLength={2000} rows={5}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {status === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg || "Errore nell'invio. Riprova."}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Invio in corso..." : "Invia messaggio"}
      </button>
    </form>
  );
}
