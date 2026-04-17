import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardCheck,
  ShieldCheck,
  Users,
  Target,
  Zap,
  Sparkles,
} from "lucide-react";
import { HeroSection } from "@/components/marketing/hero-section";
import { BridgeDiagram } from "@/components/marketing/bridge-diagram";
import { StatBlock } from "@/components/marketing/stat-block";
import { FeatureCard } from "@/components/marketing/feature-card";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export const metadata: Metadata = {
  title: "FinAgevolata — Piattaforma bandi per consulenti e aziende",
  description:
    "Gestisci bandi, documenti e Click Day in un'unica piattaforma. Consulenti e aziende lavorano insieme. Prova gratis.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: ClipboardCheck, title: "Checklist dinamica per bando", description: "Il sistema sa esattamente quali documenti servono per ogni bando e il loro stato per ogni azienda." },
  { icon: ShieldCheck, title: "Validazione proattiva", description: "Alert automatici su DURC scaduto, visure vecchie, bilanci mancanti. Prima della deadline." },
  { icon: Users, title: "Ponte bidirezionale", description: "Consulente e azienda lavorano nello stesso workspace. Niente più email perse." },
  { icon: Target, title: "Matching bando ↔ azienda", description: "Settore ATECO, dimensione, territorio. Ricevi solo i bandi che ti riguardano." },
  { icon: Zap, title: "Click Day integrato", description: "Partner MouseX nativo per bandi INAIL, Sabatini, Transizione 4.0." },
  { icon: Sparkles, title: "Onboarding automatico", description: "Inserisci P.IVA → dati CCIAA, codice ATECO e profilo azienda compilati in automatico." },
];

const FAQ = [
  { question: "Quanto costa FinAgevolata?", answer: <>Parti gratis, passa a un piano pagato solo quando serve. <Link href="/prezzi" className="font-semibold text-indigo-600 hover:underline">Vedi i prezzi</Link>.</> },
  { question: "Posso invitare i miei clienti o il mio consulente?", answer: "Sì. Un consulente gestisce più aziende, un'azienda può condividere il workspace col proprio consulente. L'invito avviene via email dal portale." },
  { question: "Come funziona l'integrazione Click Day con MouseX?", answer: "Quando una pratica è pronta, esporti i dati al partner MouseX con un click. MouseX gestisce la velocità di invio nel giorno dell'apertura del bando." },
  { question: "I miei dati sono sicuri?", answer: "Documenti cifrati a riposo, accesso solo via URL firmati a scadenza breve, row-level security sul database. GDPR compliant." },
  { question: "Posso cancellare l'account?", answer: "Sì, in qualsiasi momento dal portale. I tuoi documenti vengono eliminati secondo la nostra data retention policy." },
];

export default function HomePage() {
  return (
    <>
      <HeroSection visual={<BridgeDiagram />}>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
          La piattaforma dove consulenti e aziende lavorano <span className="text-indigo-600">insieme</span> sui bandi.
        </h1>
        <p className="mt-6 text-lg text-slate-600 md:text-xl">
          Finanza agevolata senza Excel, senza email perse, senza documenti in ritardo.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register?plan=free"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Inizia gratis <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#come-funziona"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Vedi come funziona
          </Link>
        </div>
      </HeroSection>

      <section className="border-b border-slate-200 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-indigo-600">Il problema</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Il 70% delle domande viene respinto per documenti sbagliati.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            <StatBlock value="70%" label="domande respinte per documenti incompleti o non conformi" />
            <StatBlock value="15-20 min" label="tempo medio di esaurimento fondi al Click Day" />
            <StatBlock value="300k€" label="soglia aiuti de minimis su 3 anni" source="Reg. UE 2023/2831" />
          </div>
        </div>
      </section>

      <section id="come-funziona" className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Come funziona</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Tre passi dal primo contatto all'invio della domanda.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", title: "Collega consulente e azienda", desc: "Workspace condiviso creato in 30 secondi. Ognuno accede solo a ciò che gli serve." },
              { n: "2", title: "Checklist dinamica per bando", desc: "Il sistema dice cosa serve, entro quando. L'azienda carica, il consulente valida." },
              { n: "3", title: "Invio assistito, incluso Click Day", desc: "Pratica pronta → export MouseX. Velocità garantita nei Click Day critici." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{s.n}</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Tutto in un solo posto</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Sei funzionalità costruite per la finanza agevolata italiana.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/features" className="text-sm font-semibold text-indigo-600 hover:underline">
              Scopri tutte le funzionalità →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900">Sei un consulente?</h3>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Dashboard multi-cliente, N aziende, una sola vista</li>
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Meno email, più pratiche chiuse</li>
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Click Day integrato con partner MouseX</li>
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Compliance automatica su documenti e scadenze</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900">Sei un'azienda?</h3>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Sai esattamente quale documento serve, quando</li>
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Non perdi più nessuna scadenza</li>
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Lavori nello stesso spazio del tuo consulente</li>
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Massimizzi la probabilità di successo</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/register?plan=free"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Prova gratis
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" />
            Integrato con{" "}
            <a href="https://www.mousex.it" target="_blank" rel="noreferrer noopener" className="font-semibold text-indigo-600 hover:underline">
              MouseX
            </a>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600">
            MouseX è il partner Click Day di riferimento per i bandi più competitivi d'Italia:
            INAIL ISI, Sabatini, Transizione 4.0. Quando conta la velocità, conta l'integrazione.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Domande frequenti</h2>
          <div className="mt-10">
            <FaqAccordion items={FAQ} />
          </div>
        </div>
      </section>

      <CtaBanner title="Pronto a semplificare la gestione bandi?" subtitle="Inizia con il piano Free. Niente carta di credito, nessun commitment." />
    </>
  );
}
