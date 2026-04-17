"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/marketing/plans";

type Billing = "monthly" | "annual";

export function PricingTable() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${billing === "monthly" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            Mensile
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${billing === "annual" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            Annuale <span className="ml-1 text-xs opacity-80">-20%</span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.priceMonthly : plan.priceAnnual;
          return (
            <div
              key={plan.slug}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${plan.highlight ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"}`}
            >
              {plan.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Più scelto
                </div>
              ) : null}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold tracking-tight text-slate-900">{price === 0 ? "0€" : `${price}€`}</span>
                {price > 0 ? <span className="text-sm text-slate-500">/mese</span> : null}
                {billing === "annual" && price > 0 ? (
                  <div className="mt-1 text-xs text-emerald-600">Fatturato annualmente</div>
                ) : null}
              </div>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="size-4 shrink-0 text-indigo-600" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/register?plan=${plan.slug}`}
                className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${plan.highlight ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"}`}
              >
                Inizia gratis
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
