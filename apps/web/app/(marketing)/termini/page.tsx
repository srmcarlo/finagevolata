import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termini di servizio — FinAgevolata",
  description: "Termini e condizioni d'uso della piattaforma.",
  alternates: { canonical: "/termini" },
};

export default function TerminiPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Termini di servizio</h1>
      <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <h2>1. Oggetto</h2>
        <p>FinAgevolata è un servizio SaaS per la gestione di pratiche di finanza agevolata, destinato a consulenti e imprese italiane.</p>

        <h2>2. Registrazione</h2>
        <p>L&apos;uso del servizio richiede registrazione. Garantisci la veridicità dei dati inseriti.</p>

        <h2>3. Piani e fatturazione</h2>
        <p>I piani a pagamento sono fatturati mensilmente o annualmente. Nessun commitment a lungo termine. Disdetta dal portale in qualsiasi momento.</p>

        <h2>4. Limitazioni di responsabilità</h2>
        <p>FinAgevolata è uno strumento di gestione. La responsabilità per la correttezza dei dati inseriti e la conformità della pratica al bando resta dell&apos;utente e del suo consulente.</p>

        <h2>5. Click Day</h2>
        <p>L&apos;integrazione Click Day è fornita dal partner MouseX. L&apos;esito della procedura Click Day dipende da fattori (disponibilità fondi, ordine cronologico) non controllabili da FinAgevolata.</p>

        <h2>6. Modifiche ai termini</h2>
        <p>Ci riserviamo la facoltà di modificare questi termini con preavviso email di almeno 30 giorni.</p>

        <h2>7. Legge applicabile</h2>
        <p>Legge italiana. Foro competente: Roma.</p>

        <p className="text-sm text-slate-500"><em>Testo soggetto a revisione legale prima del go-live.</em></p>
      </div>
    </article>
  );
}
