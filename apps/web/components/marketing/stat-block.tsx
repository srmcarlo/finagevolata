"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface StatBlockProps {
  value: string;
  label: string;
  source?: string;
}

function parseValue(value: string): { prefix: string; number: number; suffix: string; decimals: number } | null {
  const match = value.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, numericRaw, suffix] = match;
  const normalized = numericRaw.replace(",", ".");
  const number = parseFloat(normalized);
  if (Number.isNaN(number)) return null;
  const decimals = normalized.includes(".") ? normalized.split(".")[1].length : 0;
  return { prefix, number, suffix, decimals };
}

function formatNumber(n: number, decimals: number): string {
  return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
}

export function StatBlock({ value, label, source }: StatBlockProps) {
  const parsed = useMemo(() => parseValue(value), [value]);
  const ref = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState<string>(parsed ? `${parsed.prefix}0${parsed.suffix}` : value);

  useEffect(() => {
    if (!parsed) {
      setDisplay(value);
      return;
    }
    const node = ref.current;
    if (!node) return;

    let hasRun = false;
    let rafId: number | null = null;

    const animate = () => {
      const duration = 1400;
      const start = performance.now();
      const { prefix, number, suffix, decimals } = parsed;

      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = number * eased;
        setDisplay(`${prefix}${formatNumber(current, decimals)}${suffix}`);
        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          setDisplay(`${prefix}${formatNumber(number, decimals)}${suffix}`);
        }
      };

      rafId = requestAnimationFrame(step);
    };

    if (typeof IntersectionObserver === "undefined") {
      animate();
      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasRun) {
            hasRun = true;
            animate();
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [parsed, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl font-bold tracking-tight text-indigo-600 md:text-6xl">{display}</div>
      <div className="mt-3 text-base font-medium text-slate-900">{label}</div>
      {source ? <div className="mt-1 text-xs text-slate-500">Fonte: {source}</div> : null}
    </div>
  );
}
