import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — FinAgevolata",
  description: "Policy sui cookie utilizzati dalla piattaforma.",
  alternates: { canonical: "/cookie" },
};

export default function CookiePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Cookie Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <h2>Cookie utilizzati</h2>
        <p>Il sito utilizza esclusivamente cookie tecnici essenziali per il funzionamento del servizio:</p>
        <ul>
          <li><strong>Cookie di sessione autenticazione</strong> (next-auth) — indispensabili per l&apos;accesso al portale. Scadenza: 30 giorni.</li>
          <li><strong>Cookie CSRF</strong> — protezione contro attacchi cross-site. Scadenza: sessione.</li>
        </ul>

        <h2>Cookie analytics e marketing</h2>
        <p>Al momento <strong>non utilizziamo</strong> cookie di analytics né di marketing. Se in futuro introdurremo tracking non essenziale, aggiorneremo questa policy e mostreremo un banner di consenso.</p>

        <h2>Gestione cookie</h2>
        <p>Essendo solo cookie tecnici strettamente necessari, non è richiesto consenso. Puoi comunque bloccarli dalle impostazioni del browser; in tal caso, il servizio non sarà utilizzabile.</p>

        <p className="text-sm text-slate-500"><em>Testo soggetto a revisione legale prima del go-live.</em></p>
      </div>
    </article>
  );
}
