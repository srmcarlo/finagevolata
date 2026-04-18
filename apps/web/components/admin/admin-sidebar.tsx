import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bandi", label: "Bandi" },
  { href: "/admin/bandi/queue", label: "Coda approvazioni" },
  { href: "/admin/documenti", label: "Documenti" },
];

export function AdminSidebar() {
  return (
    <aside className="w-56 border-r border-slate-200 bg-white p-4">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Admin
        </p>
      </div>
      <nav className="space-y-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
