"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await registerUser(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Registrati su FinAgevolata</h1>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome completo</label>
            <input id="name" name="name" type="text" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" required minLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Sono un...</label>
            <select id="role" name="role" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="">Seleziona ruolo</option>
              <option value="CONSULTANT">Consulente di finanza agevolata</option>
              <option value="COMPANY">Azienda</option>
            </select>
          </div>
          <button type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition">
            Registrati
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          Hai già un account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">Accedi</a>
        </p>
      </div>
    </div>
  );
}
