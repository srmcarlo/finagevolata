"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions/invites";

interface Props {
  token: string;
  email: string;
  consultantName: string;
}

export function AcceptForm({ token, email, consultantName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await acceptInvite({
          token,
          name: String(formData.get("name") ?? ""),
          password: String(formData.get("password") ?? ""),
        });
        router.push("/login?invited=1");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-800">
        <strong>{consultantName}</strong> ti invita a usare FinAgevolata insieme.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          value={email}
          disabled
          className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nome e cognome</label>
        <input
          name="name"
          required
          minLength={2}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Creo account..." : "Crea account"}
      </button>
    </form>
  );
}
