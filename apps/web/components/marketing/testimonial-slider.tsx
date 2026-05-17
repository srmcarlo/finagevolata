"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    quote:
      "Gestire 15 pratiche con Excel e mail era diventato un incubo: documenti sempre da rincorrere, scadenze viste tardi. Con FinAgevolata il workspace condiviso azienda-consulente mi ha fatto risparmiare almeno 2 ore al giorno.",
    name: "Marco B.",
    role: "Studio commercialista, Milano",
    initials: "MB",
  },
  {
    id: 2,
    quote:
      "L'export verso MouseX funziona al primo colpo. Prima passavo mezz'ora il giorno del Click Day a raccogliere PDF da varie email, ora un click e i dati sono pronti per l'invio rapido.",
    name: "Anna R.",
    role: "Operatore Click Day, Frosinone",
    initials: "AR",
  },
  {
    id: 3,
    quote:
      "Avevamo perso due bandi negli ultimi sei mesi per documenti scaduti — DURC e visure vecchie scoperte troppo tardi. Da quando usiamo i reminder automatici di FinAgevolata, zero pratiche bocciate per documenti.",
    name: "Luca T.",
    role: "Direttore amministrativo PMI, Bologna",
    initials: "LT",
  },
];

function getVisibleCount(width: number): number {
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
}

export function TestimonialSlider() {
  const reducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [direction, setDirection] = useState<1 | -1>(1);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const oldVisible = getVisibleCount(windowWidth);
      const newVisible = getVisibleCount(newWidth);
      setWindowWidth(newWidth);
      if (oldVisible !== newVisible) {
        const maxIdx = TESTIMONIALS.length - newVisible;
        if (currentIndex > maxIdx) setCurrentIndex(Math.max(0, maxIdx));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [windowWidth, currentIndex]);

  const visibleCount = getVisibleCount(windowWidth);
  const maxIndex = Math.max(0, TESTIMONIALS.length - visibleCount);
  const canGoNext = currentIndex < maxIndex;
  const canGoPrev = currentIndex > 0;

  useEffect(() => {
    if (reducedMotion || !isAutoPlaying || maxIndex === 0) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) {
          setDirection(-1);
          return prev - 1;
        }
        if (prev <= 0) {
          setDirection(1);
          return prev + 1;
        }
        return prev + direction;
      });
    }, 4500);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, maxIndex, direction, reducedMotion]);

  function pauseAutoPlay() {
    setIsAutoPlaying(false);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsAutoPlaying(true), 8000);
  }

  function goNext() {
    if (!canGoNext) return;
    setDirection(1);
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
    pauseAutoPlay();
  }

  function goPrev() {
    if (!canGoPrev) return;
    setDirection(-1);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    pauseAutoPlay();
  }

  function goTo(index: number) {
    setCurrentIndex(index);
    pauseAutoPlay();
  }

  function handleDragEnd(_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const threshold = 50;
    if (info.offset.x < -threshold && canGoNext) goNext();
    else if (info.offset.x > threshold && canGoPrev) goPrev();
  }

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="text-center">
          <h2 className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
            Cosa dicono i nostri beta tester
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Consulenti e aziende che stanno usando FinAgevolata nei primi mesi di beta.
          </p>
          <div className="mx-auto mt-6 h-1 w-20 rounded-full bg-gradient-to-r from-indigo-600 to-violet-500" />
        </div>

        <div className="relative mt-12">
          <div className="mb-6 flex justify-end gap-2 sm:absolute sm:-top-14 sm:right-0 sm:mb-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={goPrev}
              disabled={!canGoPrev}
              aria-label="Testimonianza precedente"
              className={`rounded-full p-2 transition-all duration-200 ${
                canGoPrev
                  ? "bg-white text-indigo-600 shadow-md hover:bg-slate-50"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              <ChevronLeft className="size-5" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={goNext}
              disabled={!canGoNext}
              aria-label="Testimonianza successiva"
              className={`rounded-full p-2 transition-all duration-200 ${
                canGoNext
                  ? "bg-white text-indigo-600 shadow-md hover:bg-slate-50"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              <ChevronRight className="size-5" />
            </motion.button>
          </div>

          <div className="overflow-hidden">
            <motion.div
              className="flex"
              animate={{ x: `-${currentIndex * (100 / visibleCount)}%` }}
              transition={{ type: "spring", stiffness: 70, damping: 20 }}
            >
              {TESTIMONIALS.map((t) => (
                <motion.div
                  key={t.id}
                  className={`flex-shrink-0 p-2 ${
                    visibleCount === 3 ? "md:w-1/3" : visibleCount === 2 ? "md:w-1/2" : ""
                  } w-full`}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  whileHover={reducedMotion ? undefined : { y: -4 }}
                  whileTap={{ cursor: "grabbing" }}
                  style={{ cursor: "grab" }}
                >
                  <motion.figure
                    className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                    whileHover={
                      reducedMotion
                        ? undefined
                        : {
                            boxShadow:
                              "0 10px 15px -3px rgba(99, 102, 241, 0.10), 0 4px 6px -2px rgba(99, 102, 241, 0.05)",
                          }
                    }
                  >
                    <div className="absolute -left-3 -top-3 opacity-10">
                      <Quote className="size-14 text-indigo-600" />
                    </div>
                    <div className="relative z-10 flex h-full flex-col">
                      <blockquote className="flex-1 text-sm font-medium leading-relaxed text-slate-700">
                        &ldquo;{t.quote}&rdquo;
                      </blockquote>
                      <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                        <div className="relative flex-shrink-0">
                          <span
                            aria-hidden
                            className="inline-flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-sm"
                          >
                            {t.initials}
                          </span>
                          {!reducedMotion && (
                            <motion.div
                              className="absolute inset-0 rounded-full bg-indigo-400/30"
                              animate={{ scale: [1, 1.4, 1], opacity: [0, 0.4, 0] }}
                              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }}
                            />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                          <span className="text-xs text-slate-500">{t.role}</span>
                        </div>
                      </figcaption>
                    </div>
                  </motion.figure>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {maxIndex > 0 && (
            <div className="mt-8 flex justify-center">
              {Array.from({ length: maxIndex + 1 }, (_, index) => (
                <motion.button
                  key={index}
                  type="button"
                  onClick={() => goTo(index)}
                  className="relative mx-1 focus:outline-none"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={`Vai alla testimonianza ${index + 1}`}
                >
                  <span
                    className={`block size-2 rounded-full transition-colors ${
                      index === currentIndex ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  />
                  {index === currentIndex && !reducedMotion && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-indigo-600/30"
                      animate={{ scale: [1, 1.8], opacity: [1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-slate-500">
          Citazioni rappresentative della nostra community beta. Stiamo raccogliendo
          testimonial verificati dai primi clienti.
        </p>
      </div>
    </section>
  );
}
