"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, FileCheck2, LayoutDashboard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SparkleCta } from "./sparkle-cta";

type Tone = "indigo" | "emerald";

interface PersonaCardProps {
  index: string;
  tag: string;
  title: string;
  bullets: string[];
  icon: LucideIcon;
  tone: Tone;
}

const TONE: Record<
  Tone,
  {
    colorStrong: string;
    colorLight: string;
    colorBgSoft: string;
    iconColor: string;
    tagBg: string;
    tagText: string;
    bulletCheck: string;
  }
> = {
  indigo: {
    colorStrong: "hsl(238 84% 60%)",
    colorLight: "hsl(231 100% 90%)",
    colorBgSoft: "hsl(228 100% 98%)",
    iconColor: "text-indigo-500",
    tagBg: "bg-indigo-50",
    tagText: "text-indigo-700",
    bulletCheck: "text-indigo-600",
  },
  emerald: {
    colorStrong: "hsl(160 84% 39%)",
    colorLight: "hsl(150 80% 88%)",
    colorBgSoft: "hsl(150 100% 98%)",
    iconColor: "text-emerald-500",
    tagBg: "bg-emerald-50",
    tagText: "text-emerald-700",
    bulletCheck: "text-emerald-600",
  },
};

function PersonaCard({ index, tag, title, bullets, icon: Icon, tone }: PersonaCardProps) {
  const reducedMotion = useReducedMotion();
  const t = TONE[tone];

  const cardVariants: Variants = {
    initial: { y: 0 },
    hover: { y: reducedMotion ? 0 : -8 },
  };

  const iconVariants: Variants = {
    initial: { scale: 1, y: 0 },
    hover: { scale: reducedMotion ? 1 : 1.15, y: reducedMotion ? 0 : -8 },
  };

  return (
    <motion.div
      initial="initial"
      whileHover="hover"
      variants={cardVariants}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow",
        "hover:shadow-xl",
      )}
      style={{ ["--persona-color" as string]: t.colorStrong }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          background: `radial-gradient(circle at 60% 0%, ${t.colorLight} 0%, transparent 65%)`,
        }}
      />

      <div className="absolute right-6 top-6 z-10 font-mono text-sm font-semibold tracking-wider text-slate-300">
        {index}
      </div>

      <motion.div
        variants={iconVariants}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative z-10 flex justify-center py-4"
      >
        <div
          className="flex size-28 items-center justify-center rounded-2xl"
          style={{ backgroundColor: t.colorBgSoft }}
        >
          <Icon className={cn("size-14", t.iconColor)} strokeWidth={1.5} />
        </div>
      </motion.div>

      <div className="relative z-10 mt-6">
        <span
          className={cn(
            "mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
            t.tagBg,
            t.tagText,
          )}
        >
          {tag}
        </span>
        <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
        <ul className="mt-5 space-y-3 text-sm text-slate-700">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check className={cn("mt-0.5 size-4 shrink-0", t.bulletCheck)} aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

const PERSONAS: PersonaCardProps[] = [
  {
    index: "01",
    tag: "Consulente",
    title: "Sei un consulente?",
    bullets: [
      "Dashboard multi-cliente, N aziende, una sola vista",
      "Meno email, piu pratiche chiuse",
      "Click Day integrato con partner MouseX",
      "Compliance automatica su documenti e scadenze",
    ],
    icon: LayoutDashboard,
    tone: "indigo",
  },
  {
    index: "02",
    tag: "Azienda",
    title: "Sei un'azienda?",
    bullets: [
      "Sai esattamente quale documento serve, quando",
      "Non perdi piu nessuna scadenza",
      "Lavori nello stesso spazio del tuo consulente",
      "Massimizzi la probabilita di successo",
    ],
    icon: FileCheck2,
    tone: "emerald",
  },
];

export function PersonaCards() {
  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {PERSONAS.map((p) => (
            <PersonaCard key={p.index} {...p} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <SparkleCta href="/register?plan=free" label="Prova gratis" />
        </div>
      </div>
    </section>
  );
}
