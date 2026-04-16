"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateConsultantProfile } from "@/lib/actions/profile";

interface ProfileData {
  firmName: string;
  specializations: string;
  maxClients: number;
}

export function ConsultantProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await updateConsultantProfile(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded">Profilo aggiornato con successo!</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Nome Studio / Ragione Sociale</label>
        <input name="firmName" type="text" required
          defaultValue={profile.firmName}
          placeholder="es. Studio Bianchi & Associati"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Specializzazioni</label>
        <input name="specializations" type="text"
          defaultValue={profile.specializations}
          placeholder="es. PNRR, Industria 4.0, Credito d'imposta"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        <p className="text-xs text-gray-400 mt-1">Separate da virgola</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Numero massimo clienti</label>
        <input name="maxClients" type="number" required min={1} max={999}
          defaultValue={profile.maxClients}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </div>

      <button type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
        Salva modifiche
      </button>
    </form>
  );
}
