"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmailCode, resendVerificationCode } from "@/lib/actions/email-verification";

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email } = use(searchParams);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) {
      setError("Email mancante");
      return;
    }
    setError("");
    setInfo("");
    setSubmitting(true);
    const res = await verifyEmailCode({ email, code });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setInfo("Email verificata. Accedi con le tue credenziali.");
    setTimeout(() => router.push("/login"), 1500);
  }

  async function handleResend() {
    if (!email) {
      setError("Email mancante");
      return;
    }
    setError("");
    setInfo("");
    setResending(true);
    const res = await resendVerificationCode(email);
    setResending(false);
    if (res.error) {
      setError(res.error);
      if (res.cooldownRemaining) setCooldown(res.cooldownRemaining);
      return;
    }
    setInfo("Codice inviato. Controlla la tua casella.");
    setCooldown(60);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Verifica la tua email</h1>
          {email ? (
            <p className="mt-2 text-sm text-gray-500">
              Abbiamo inviato un codice a 6 cifre a <strong className="text-gray-900">{email}</strong>
            </p>
          ) : (
            <p className="mt-2 text-sm text-red-600">Email mancante nei parametri</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
        {info && <p className="text-sm text-green-700 bg-green-50 p-3 rounded">{info}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Codice di verifica
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-mono tracking-[0.4em] shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="123456"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || code.length !== 6 || !email}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? "Verifica in corso..." : "Verifica"}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-500">Non hai ricevuto il codice? </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {cooldown > 0 ? `Rinvia tra ${cooldown}s` : resending ? "Invio..." : "Rinvia codice"}
          </button>
        </div>

        <div className="text-center text-xs text-gray-400 border-t pt-4">
          <Link href="/login" className="hover:underline">
            Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
