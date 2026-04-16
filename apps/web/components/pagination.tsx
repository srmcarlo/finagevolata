import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ page, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPagesArray(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <PaginationLink
        href={page > 1 ? `${basePath}?page=${page - 1}` : null}
        label="←"
        disabled={page <= 1}
      />

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-3 py-1 text-sm text-gray-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={`${basePath}?page=${p}`}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              p === page
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {p}
          </Link>
        )
      )}

      <PaginationLink
        href={page < totalPages ? `${basePath}?page=${page + 1}` : null}
        label="→"
        disabled={page >= totalPages}
      />
    </div>
  );
}

function PaginationLink({
  href,
  label,
  disabled,
}: {
  href: string | null;
  label: string;
  disabled: boolean;
}) {
  if (disabled || !href) {
    return (
      <span className="px-3 py-1 rounded text-sm text-gray-300 cursor-not-allowed">
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className="px-3 py-1 rounded text-sm text-gray-700 hover:bg-gray-100 transition">
      {label}
    </Link>
  );
}

function getPagesArray(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("…");

  pages.push(total);
  return pages;
}
