import type { Metadata } from "next";
import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = {
  title: "Funzionalità — FinAgevolata",
  description:
    "Checklist dinamica, validazione proattiva, Click Day MouseX, matching bando-azienda. Scopri tutte le features.",
  alternates: { canonical: "/features" },
};

const SECTIONS = [
  {
    id: "checklist-dinamica",
    title: "Checklist dinamica per bando",
    body: "Ogni bando ha requisiti diversi. FinAgevolata genera automaticamente la lista dei documenti necessari a partire dal bando selezionato, segnala lo stato di ognuno (mancante / caricato / in revisione / approvato / rifiutato) e calcola le scadenze (DURC 120 giorni, visura camerale 6 mesi, ecc.).",
    bullets: ["Genera checklist a partire dal bando", "Stato documento tracciato in tempo reale", "Scadenze calcolate automaticamente", "Promemoria a 30/15/7 giorni"],
  },
  {
    id: "validazione-proattiva",
    title: "Validazione documenti proattiva",
    body: "Il sistema controlla formati, dimensioni e validità dei documenti caricati. Se un DURC sta per scadere o un bilancio è del 2023 quando ne serve uno del 2024, ti avvisa prima che sia un problema. Niente più sorprese nella fase finale della domanda.",
    bullets: ["Check automatico formato e dimensione", "Alert su documenti in scadenza", "Versioning: storico delle versioni caricate", "Flag su bilanci / visure obsoleti"],
  },
  {
    id: "ponte-bidirezionale",
    title: "Ponte bidirezionale consulente ⇄ azienda",
    body: "A differenza delle altre piattaforme, qui sia il consulente che l'azienda hanno un portale con permessi chiari: l'azienda carica, il consulente valida e compila. Tutto nello stesso workspace, con chat integrata per pratica.",
    bullets: ["Un workspace per pratica", "Chat contestuale", "Permessi row-level: ognuno vede solo ciò che gli compete", "Audit log completo"],
  },
  {
    id: "matching",
    title: "Matching bando ↔ profilo azienda",
    body: "Basato su settore ATECO, dimensione aziendale, localizzazione e requisiti specifici. Il consulente riceve suggerimenti sui bandi attivabili per ogni cliente. L'azienda in piano Free vede i 3-5 bandi più rilevanti per il proprio profilo.",
    bullets: ["Filtraggio per ATECO e regione", "Dimensione azienda (micro / small / medium / large)", "Requisiti specifici (de minimis, antimafia, ecc.)", "Scoring predittivo (Fase 2)"],
  },
  {
    id: "click-day",
    title: "Integrazione Click Day con MouseX",
    body: "Quando una pratica è pronta, un click esporta i dati al partner MouseX, che garantisce velocità di invio nel giorno dell'apertura del bando. Unico nel mercato: nessun altro SaaS italiano offre questa integrazione nativa.",
    bullets: ["Export one-click verso MouseX", "Tracking stato Click Day: inviato / in graduatoria / esito", "Specializzato su bandi INAIL, Sabatini, Transizione 4.0", "Niente workaround manuali"],
  },
  {
    id: "onboarding-piva",
    title: "Onboarding automatico da P.IVA",
    body: "L'azienda inserisce la Partita IVA: FinAgevolata recupera in automatico ragione sociale, codice ATECO con descrizione, forma legale e provincia dai dati CCIAA. Onboarding in meno di 60 secondi.",
    bullets: ["Auto-compilazione da P.IVA", "Dati camerali aggiornati", "Codice ATECO + descrizione", "Form minimale: resta da scegliere solo la dimensione e l'email"],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Tutto quello che serve per chiudere la pratica.
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Sei funzionalità chiave. Costruite per la finanza agevolata italiana, non adattate da altri mercati.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        {SECTIONS.map((s, i) => (
          <section key={s.id} id={s.id} className={`${i === 0 ? "" : "mt-20"} scroll-mt-24`}>
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Funzionalità {i + 1}</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{s.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{s.body}</p>
            <ul className="mt-6 grid gap-2 md:grid-cols-2">
              {s.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-indigo-600">✓</span> {b}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <CtaBanner title="Prova tutte le funzionalità gratis" subtitle="Piano Free senza carta di credito. Upgrade quando ti serve." />
    </>
  );
}
