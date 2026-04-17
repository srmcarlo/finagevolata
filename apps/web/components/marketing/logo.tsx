import Link from "next/link";

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-xl font-bold tracking-tight ${className ?? ""}`}
      aria-label="FinAgevolata — home"
    >
      <span className="text-indigo-600">Fin</span>
      <span className="text-slate-900">Agevolata</span>
    </Link>
  );
}
