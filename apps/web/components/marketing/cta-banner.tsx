import Link from "next/link";

interface CtaBannerProps {
  title: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CtaBanner({
  title,
  subtitle,
  primaryHref = "/register?plan=free",
  primaryLabel = "Inizia gratis",
  secondaryHref = "/contatti",
  secondaryLabel = "Parla con noi",
}: CtaBannerProps) {
  return (
    <section className="bg-slate-900 py-16">
      <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-4 text-lg text-slate-300">{subtitle}</p> : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
