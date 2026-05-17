import { Cloud, Database, Mail, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LOGOS: { label: string; icon: LucideIcon }[] = [
  { label: "Hosted on Vercel", icon: Cloud },
  { label: "Database Supabase EU", icon: Database },
  { label: "Email via Resend", icon: Mail },
  { label: "Powered by AI Gemini", icon: Sparkles },
  { label: "MouseX Click Day Partner", icon: Zap },
];

export function TrustLogos() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
          Costruito su uno stack moderno e affidabile
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {LOGOS.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600"
            >
              <Icon className="size-3.5 text-indigo-500" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
