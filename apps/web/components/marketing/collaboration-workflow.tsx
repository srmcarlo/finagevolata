"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  UserRound,
} from "lucide-react";

type Step =
  | "idle"
  | "upload"
  | "transmit"
  | "toast"
  | "ai"
  | "deadline"
  | "approved"
  | "settled";

const STEP_ORDER: Step[] = [
  "idle",
  "upload",
  "transmit",
  "toast",
  "ai",
  "deadline",
  "approved",
  "settled",
];

function stepIndex(step: Step) {
  return STEP_ORDER.indexOf(step);
}

function reached(step: Step, target: Step) {
  return stepIndex(step) >= stepIndex(target);
}

function CollaborationWorkflowDesktop() {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState<Step>(prefersReducedMotion ? "settled" : "idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setStep("settled");
      return;
    }

    function clearAll() {
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    }

    function startCycle() {
      clearAll();
      setStep("idle");
      const t1 = setTimeout(() => setStep("upload"), 200);
      const t2 = setTimeout(() => setStep("transmit"), 800);
      const t3 = setTimeout(() => setStep("toast"), 1700);
      const t4 = setTimeout(() => setStep("ai"), 3200);
      const t5 = setTimeout(() => setStep("deadline"), 4400);
      const t6 = setTimeout(() => setStep("approved"), 5600);
      const t7 = setTimeout(() => setStep("settled"), 6600);
      const t8 = setTimeout(() => startCycle(), 10600);
      timers.current = [t1, t2, t3, t4, t5, t6, t7, t8];
    }

    startCycle();

    return () => {
      clearAll();
    };
  }, [prefersReducedMotion]);

  const showToast = step === "toast";
  const showAi = reached(step, "ai");
  const showDeadline = reached(step, "deadline");
  const approved = reached(step, "approved");

  const aziendaActive = step === "upload" || step === "transmit";
  const consulenteActive = step === "toast" || step === "ai";
  const aiActive = step === "ai" || step === "deadline";

  const glow = "0 0 24px rgba(99,102,241,0.25)";
  const glowEmerald = "0 0 24px rgba(16,185,129,0.25)";
  const glowViolet = "0 0 24px rgba(139,92,246,0.30)";

  return (
    <div
      className="relative hidden h-[420px] w-full max-w-xl md:block sm:h-[480px]"
      aria-label="Schema collaborazione tra azienda e consulente sui bandi"
      role="img"
    >
      {/* Subtle radial background */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.08), transparent 55%), radial-gradient(circle at 80% 80%, rgba(16,185,129,0.06), transparent 55%)",
        }}
      />

      {/* Connection lines SVG */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 600 480"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="cw-line-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        {/* Azienda (top-left) -> AI (center) */}
        <motion.path
          d="M 130 110 C 220 160, 240 200, 300 240"
          stroke="url(#cw-line-grad)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="6 6"
          initial={false}
          animate={
            prefersReducedMotion
              ? { strokeDashoffset: 0, opacity: 0.5 }
              : {
                  strokeDashoffset: step === "transmit" ? -120 : 0,
                  opacity: reached(step, "transmit") ? 0.7 : 0.35,
                }
          }
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
        {/* AI (center) -> Consulente (bottom-right) */}
        <motion.path
          d="M 300 240 C 360 280, 420 320, 480 380"
          stroke="url(#cw-line-grad)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="6 6"
          initial={false}
          animate={
            prefersReducedMotion
              ? { strokeDashoffset: 0, opacity: 0.5 }
              : {
                  strokeDashoffset: reached(step, "ai") ? -120 : 0,
                  opacity: reached(step, "ai") ? 0.7 : 0.35,
                }
          }
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      </svg>

      {/* Flying document icon (Azienda -> AI) */}
      <AnimatePresence>
        {step === "transmit" && !prefersReducedMotion ? (
          <motion.div
            key="flying-doc"
            className="absolute z-20 flex size-9 items-center justify-center rounded-lg border border-indigo-200 bg-white shadow-md"
            initial={{ left: "20%", top: "18%", opacity: 0, scale: 0.6 }}
            animate={{ left: "46%", top: "46%", opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
          >
            <FileText className="size-4 text-indigo-600" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Card Azienda — top-left */}
      <motion.div
        className="absolute left-2 top-2 w-[58%] max-w-[280px] rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-lg backdrop-blur-md"
        initial={false}
        animate={
          prefersReducedMotion
            ? { scale: 1, boxShadow: "0 10px 25px rgba(15,23,42,0.06)" }
            : {
                scale: aziendaActive ? 1.02 : 1,
                boxShadow: aziendaActive ? glowEmerald : "0 10px 25px rgba(15,23,42,0.06)",
              }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Azienda</p>
            <p className="truncate text-sm font-semibold text-slate-900">ACME Srl</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <FileText className="size-4 shrink-0 text-slate-500" />
          <span className="truncate text-xs text-slate-700">visura-camerale.pdf</span>
        </div>
        <AnimatePresence>
          {reached(step, "upload") && step !== "settled" ? (
            <motion.div
              key="upload-badge"
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle2 className="size-3" /> Caricato
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Card Consulente — bottom-right */}
      <motion.div
        className="absolute bottom-2 right-2 w-[58%] max-w-[280px] rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-lg backdrop-blur-md"
        initial={false}
        animate={
          prefersReducedMotion
            ? { scale: 1, boxShadow: "0 10px 25px rgba(15,23,42,0.06)" }
            : {
                scale: consulenteActive ? 1.02 : 1,
                boxShadow: consulenteActive ? glow : "0 10px 25px rgba(15,23,42,0.06)",
              }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-700">Consulente</p>
            <p className="truncate text-sm font-semibold text-slate-900">Studio Bianchi</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-600">Clienti attivi</span>
          <span className="text-xs font-semibold text-slate-900">12</span>
        </div>
      </motion.div>

      {/* Card AI — center, appears step 4 */}
      <AnimatePresence>
        {showAi ? (
          <motion.div
            key="ai-card"
            className="absolute left-1/2 top-1/2 z-10 w-[46%] max-w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-violet-200/60 bg-white/80 p-4 shadow-lg backdrop-blur-md"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: 1,
              boxShadow: aiActive ? glowViolet : "0 10px 25px rgba(15,23,42,0.06)",
            }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-violet-100 text-violet-700">
                <Sparkles className="size-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                Verifica AI
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {approved ? (
                <motion.div
                  key="ai-check"
                  initial={prefersReducedMotion ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white"
                >
                  <CheckCircle2 className="size-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="ai-spinner"
                  className="size-5 rounded-full border-2 border-violet-200 border-t-violet-600"
                  animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
              )}
              <span className="text-xs text-slate-700">
                {approved ? "Documento conforme" : "Analisi in corso…"}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Toast notification — top-right */}
      <AnimatePresence>
        {showToast && !prefersReducedMotion ? (
          <motion.div
            key="toast"
            className="absolute right-2 top-2 z-30 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            role="status"
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="size-3" />
            </span>
            <span className="text-xs font-medium text-slate-800">
              Nuovo documento ricevuto
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Deadline badge — small, right side */}
      <AnimatePresence>
        {showDeadline ? (
          <motion.div
            key="deadline"
            className="absolute right-2 top-20 z-20 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shadow-sm"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
          >
            <Clock className="size-3" />
            Scadenza aggiornata
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Status pill — bottom center */}
      <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2">
        <motion.div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
          initial={false}
          animate={
            approved
              ? {
                  backgroundColor: "rgb(220 252 231)",
                  color: "rgb(5 122 85)",
                  borderColor: "rgb(167 243 208)",
                }
              : {
                  backgroundColor: "rgb(238 242 255)",
                  color: "rgb(67 56 202)",
                  borderColor: "rgb(199 210 254)",
                }
          }
          style={{ borderWidth: 1, borderStyle: "solid" }}
          transition={{ duration: 0.5 }}
        >
          <motion.span
            className="size-1.5 rounded-full"
            animate={
              prefersReducedMotion
                ? undefined
                : { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }
            }
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ backgroundColor: approved ? "rgb(16 185 129)" : "rgb(99 102 241)" }}
          />
          {approved ? "Approvata" : "In revisione"}
        </motion.div>
      </div>
    </div>
  );
}

function CollaborationWorkflowMobile() {
  return (
    <div
      className="relative block w-full max-w-sm md:hidden"
      aria-label="Schema collaborazione tra azienda e consulente sui bandi"
      role="img"
    >
      <div className="flex flex-col items-stretch gap-3">
        {/* Azienda */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                Azienda
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">ACME Srl</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <FileText className="size-4 shrink-0 text-slate-500" />
            <span className="truncate text-xs text-slate-700">visura-camerale.pdf</span>
          </div>
        </div>

        {/* connector */}
        <div className="mx-auto h-6 w-px bg-gradient-to-b from-emerald-300 to-violet-300" aria-hidden />

        {/* AI */}
        <div className="rounded-2xl border border-violet-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-violet-700">
                Verifica AI
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">Documento conforme</p>
            </div>
            <span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
        </div>

        {/* connector */}
        <div className="mx-auto h-6 w-px bg-gradient-to-b from-violet-300 to-indigo-300" aria-hidden />

        {/* Consulente */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <UserRound className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-700">
                Consulente
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">Studio Bianchi</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="size-3" /> Pratica approvata
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollaborationWorkflow() {
  return (
    <>
      <CollaborationWorkflowDesktop />
      <CollaborationWorkflowMobile />
    </>
  );
}
