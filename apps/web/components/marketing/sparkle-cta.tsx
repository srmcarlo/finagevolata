"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkleCtaProps {
  href: string;
  label: string;
  className?: string;
}

const ORBIT_SPARKLES = [
  { x: -34, y: -22, size: 8, delay: 0, duration: 2.4 },
  { x: 30, y: -28, size: 6, delay: 0.4, duration: 2.0 },
  { x: 36, y: 18, size: 5, delay: 0.8, duration: 2.6 },
  { x: -28, y: 22, size: 7, delay: 1.2, duration: 2.2 },
  { x: 0, y: -36, size: 4, delay: 1.6, duration: 2.8 },
  { x: 0, y: 34, size: 5, delay: 2.0, duration: 2.4 },
];

export function SparkleCta({ href, label, className }: SparkleCtaProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative inline-block"
      whileHover={reducedMotion ? undefined : { scale: 1.04 }}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
    >
      {!reducedMotion && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {ORBIT_SPARKLES.map((s, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{ x: s.x, y: s.y }}
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 180, 360] }}
              transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkle
                className="text-white drop-shadow-[0_0_4px_rgba(167,139,250,0.7)]"
                style={{ width: s.size, height: s.size }}
                fill="currentColor"
              />
            </motion.div>
          ))}
        </div>
      )}

      <Link
        href={href}
        className={cn(
          "relative inline-flex items-center gap-2 rounded-full p-[2px]",
          "bg-gradient-to-r from-sky-300/40 via-indigo-500/40 via-40% to-violet-500/40",
          "shadow-lg shadow-indigo-500/20 transition-shadow hover:shadow-xl hover:shadow-indigo-500/30",
          className,
        )}
      >
        <span className="relative flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 via-40% to-violet-500 px-6 py-3 text-base font-semibold text-white">
          <Sparkle className="size-5" fill="currentColor" />
          {label}
          {!reducedMotion && (
            <>
              <Sparkle
                aria-hidden
                className="absolute left-7 top-2 size-2 rotate-12 fill-white opacity-90"
                style={{ animation: "sparkle-fade 3s ease-in-out infinite" }}
              />
              <Sparkle
                aria-hidden
                className="absolute right-6 bottom-2.5 size-1.5 -rotate-12 fill-white opacity-80"
                style={{ animation: "sparkle-fade 3s ease-in-out infinite 1.5s" }}
              />
            </>
          )}
        </span>
      </Link>
    </motion.div>
  );
}
