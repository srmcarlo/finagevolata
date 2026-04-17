import Link from "next/link";
import { Logo } from "./logo";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-slate-600">
              La piattaforma dove consulenti e aziende lavorano insieme sui bandi.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Prodotto</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/features" className="hover:text-slate-900">Funzionalità</Link></li>
              <li><Link href="/prezzi" className="hover:text-slate-900">Prezzi</Link></li>
              <li><Link href="/register?plan=free" className="hover:text-slate-900">Inizia gratis</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Risorse</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/contatti" className="hover:text-slate-900">Contatti</Link></li>
              <li>
                <a href="https://www.mousex.it" target="_blank" rel="noreferrer noopener" className="hover:text-slate-900">
                  Partner MouseX
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/privacy" className="hover:text-slate-900">Privacy</Link></li>
              <li><Link href="/termini" className="hover:text-slate-900">Termini</Link></li>
              <li><Link href="/cookie" className="hover:text-slate-900">Cookie</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center">
          <p className="text-sm text-slate-500">© {year} FinAgevolata. Tutti i diritti riservati.</p>
          <p className="text-sm text-slate-500">
            Click Day powered by{" "}
            <a href="https://www.mousex.it" target="_blank" rel="noreferrer noopener" className="font-semibold text-indigo-600 hover:underline">
              MouseX
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
