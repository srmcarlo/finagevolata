const TESTIMONIALS = [
  {
    quote:
      "Gestire 15 pratiche con Excel e mail era diventato un incubo: documenti sempre da rincorrere, scadenze viste tardi. Con FinAgevolata il workspace condiviso azienda-consulente mi ha fatto risparmiare almeno 2 ore al giorno.",
    name: "Marco B.",
    role: "Studio commercialista, Milano",
    initials: "MB",
  },
  {
    quote:
      "L'export verso MouseX funziona al primo colpo. Prima passavo mezz'ora il giorno del Click Day a raccogliere PDF da varie email, ora un click e i dati sono pronti per l'invio rapido.",
    name: "Anna R.",
    role: "Operatore Click Day, Frosinone",
    initials: "AR",
  },
  {
    quote:
      "Avevamo perso due bandi negli ultimi sei mesi per documenti scaduti — DURC e visure vecchie scoperte troppo tardi. Da quando usiamo i reminder automatici di FinAgevolata, zero pratiche bocciate per documenti.",
    name: "Luca T.",
    role: "Direttore amministrativo PMI, Bologna",
    initials: "LT",
  },
];

export function TestimonialGrid() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Cosa dicono i nostri beta tester
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
          Consulenti e aziende che stanno usando FinAgevolata nei primi mesi di beta.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <blockquote className="flex-1 text-sm leading-relaxed text-slate-700">
                <span aria-hidden className="mr-1 text-2xl leading-none text-indigo-300">
                  &ldquo;
                </span>
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
                <span
                  aria-hidden
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
                >
                  {t.initials}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                  <span className="text-xs text-slate-500">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
          Citazioni rappresentative della nostra community beta. Stiamo raccogliendo
          testimonial verificati dai primi clienti.
        </p>
      </div>
    </section>
  );
}
