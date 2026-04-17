import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PricingComparison } from "@/components/marketing/pricing-comparison";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = {
  title: "Prezzi — FinAgevolata",
  description: "Piani da 0€ (Free) a 399€/mese (Studio). Senza commitment. Inizia gratis ora.",
  alternates: { canonical: "/prezzi" },
};

const FAQ = [
  { question: "Come avviene la fatturazione?", answer: "Fattura elettronica mensile o annuale. IVA 22% esclusa dai prezzi mostrati, aggiunta in fattura." },
  { question: "Posso cambiare piano in qualsiasi momento?", answer: "Sì. Upgrade: attivo subito, pro-rata sul ciclo corrente. Downgrade: attivo dal ciclo successivo." },
  { question: "Come disdico l'abbonamento?", answer: "Dal portale, sezione Impostazioni → Fatturazione. Nessun commitment, nessuna penale." },
  { question: "C'è un periodo di prova a pagamento?", answer: "No, il piano Free è gratuito per sempre (con limiti). Puoi provare la piattaforma senza carta di credito." },
];

export default function PrezziPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Un piano per ogni dimensione.</h1>
          <p className="mt-6 text-lg text-slate-600">
            Parti gratis. Paghi solo quando cresci. Nessun commitment annuale.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <PricingTable />
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Confronto completo</h2>
          <div className="mt-10">
            <PricingComparison />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Domande frequenti</h2>
          <div className="mt-10">
            <FaqAccordion items={FAQ} />
          </div>
        </div>
      </section>

      <CtaBanner title="Inizia oggi. Gratis." subtitle="Passa a un piano pagato solo quando ti serve." />
    </>
  );
}
