import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — FinAgevolata",
  description: "Informativa sulla privacy e trattamento dei dati personali.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <h2>Titolare del trattamento</h2>
        <p>FinAgevolata (di seguito &quot;noi&quot;) tratta i tuoi dati personali nel rispetto del Regolamento UE 2016/679 (GDPR).</p>

        <h2>Dati raccolti</h2>
        <ul>
          <li>Dati account: nome, email, ruolo (consulente / azienda)</li>
          <li>Dati aziendali: P.IVA, ragione sociale, codice ATECO, regione</li>
          <li>Documenti caricati per pratiche di finanza agevolata</li>
          <li>Log tecnici (IP, user agent) per sicurezza e anti-abuso</li>
        </ul>

        <h2>Finalità del trattamento</h2>
        <ul>
          <li>Fornire il servizio di gestione bandi e documenti</li>
          <li>Comunicare scadenze e aggiornamenti via email</li>
          <li>Rispettare obblighi di legge</li>
        </ul>

        <h2>Conservazione</h2>
        <p>I dati sono conservati per la durata del rapporto contrattuale. I documenti di pratiche chiuse sono conservati per i termini previsti dai bandi (tipicamente 10 anni).</p>

        <h2>Diritti dell&apos;interessato</h2>
        <p>Hai diritto di accesso, rettifica, cancellazione, limitazione e portabilità. Scrivi a <a href="mailto:axentra.italia@gmail.com">axentra.italia@gmail.com</a> per esercitarli.</p>

        <h2>Sicurezza</h2>
        <p>Documenti cifrati a riposo e in transito, accesso ristretto via URL firmati, row-level security sul database.</p>

        <p className="text-sm text-slate-500"><em>Testo soggetto a revisione legale prima del go-live.</em></p>
      </div>
    </article>
  );
}
