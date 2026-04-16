"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyProfile } from "@/lib/actions/profile";
import { ITALIAN_REGIONS } from "@finagevolata/shared";

interface ProfileData {
  vatNumber: string;
  companyName: string;
  legalForm: string;
  atecoCode: string;
  atecoDescription: string;
  province: string;
  region: string;
  employeeCount: string;
}

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await updateCompanyProfile(formData);

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

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Partita IVA</label>
          <input name="vatNumber" type="text" required maxLength={11} pattern="\d{11}"
            defaultValue={profile.vatNumber}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Ragione Sociale</label>
          <input name="companyName" type="text" required
            defaultValue={profile.companyName}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Forma Giuridica</label>
          <select name="legalForm" required defaultValue={profile.legalForm}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
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
          <select name="employeeCount" required defaultValue={profile.employeeCount}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
            <option value="MICRO">Micro (&lt;10 dipendenti)</option>
            <option value="SMALL">Piccola (10-49)</option>
            <option value="MEDIUM">Media (50-249)</option>
            <option value="LARGE">Grande (250+)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Codice ATECO</label>
          <input name="atecoCode" type="text" required
            defaultValue={profile.atecoCode}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descrizione ATECO</label>
          <input name="atecoDescription" type="text" required
            defaultValue={profile.atecoDescription}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Regione</label>
          <select name="region" required defaultValue={profile.region}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
            {ITALIAN_REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Provincia</label>
          <input name="province" type="text" required
            defaultValue={profile.province}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>

      <button type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
        Salva modifiche
      </button>
    </form>
  );
}
