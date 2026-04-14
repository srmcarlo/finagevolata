"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/lib/actions/companies";
import { ITALIAN_REGIONS } from "@finagevolata/shared";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await completeOnboarding(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/azienda");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Completa il profilo aziendale</h1>
        <p className="text-center text-sm text-gray-500">Inserisci i dati della tua azienda per iniziare</p>
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Partita IVA</label>
              <input name="vatNumber" type="text" required maxLength={11} pattern="\d{11}"
                placeholder="12345678901"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Ragione Sociale</label>
              <input name="companyName" type="text" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Forma Giuridica</label>
              <select name="legalForm" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
                <option value="">Seleziona</option>
                <option value="SRL">SRL</option>
                <option value="SRLS">SRLS</option>
                <option value="SPA">SPA</option>
                <option value="SNC">SNC</option>
                <option value="SAS">SAS</option>
                <option value="DITTA_INDIVIDUALE">Ditta Individuale</option>
                <option value="COOPERATIVA">Cooperativa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dimensione</label>
              <select name="employeeCount" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
                <option value="">Seleziona</option>
                <option value="MICRO">Micro (&lt;10 dipendenti)</option>
                <option value="SMALL">Piccola (10-49)</option>
                <option value="MEDIUM">Media (50-249)</option>
                <option value="LARGE">Grande (250+)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Codice ATECO</label>
              <input name="atecoCode" type="text" required placeholder="28.99"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrizione ATECO</label>
              <input name="atecoDescription" type="text" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Regione</label>
              <select name="region" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
                <option value="">Seleziona</option>
                {ITALIAN_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia</label>
              <input name="province" type="text" required placeholder="MI"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition">
            Salva e continua
          </button>
        </form>
      </div>
    </div>
  );
}
