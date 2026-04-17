import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contatti — FinAgevolata",
  description: "Parla con il team. Demo personalizzata per consulenti e aziende.",
  alternates: { canonical: "/contatti" },
};

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function ContattiPage({ searchParams }: PageProps) {
  const { plan } = await searchParams;

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Parla con noi.</h1>
          <p className="mt-6 text-lg text-slate-600">
            Scrivi per una demo, domande tecniche o qualsiasi altra richiesta. Rispondiamo entro un giorno lavorativo.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 lg:grid-cols-5 lg:px-8">
          <div className="lg:col-span-3">
            <ContactForm defaultPlan={plan} />
          </div>

          <aside className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Altri canali</h2>
            <ul className="mt-4 space-y-4 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-indigo-600" />
                <div>
                  <div className="font-medium">Email</div>
                  <a href="mailto:axentra.italia@gmail.com" className="text-indigo-600 hover:underline">
                    axentra.italia@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 size-4 text-emerald-600" />
                <div>
                  <div className="font-medium">WhatsApp</div>
                  <a
                    href="https://api.whatsapp.com/send/?phone=393459938680"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-indigo-600 hover:underline"
                  >
                    +39 345 993 8680
                  </a>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
