"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { MatchScoreBadge } from "./match-score-badge";
import { MatchChips } from "./match-chips";
import { MatchBreakdown } from "./match-breakdown";
import type { MatchScore } from "@/lib/services/matching";

export function MatchCard({
  grant,
  score,
  fetchExplanation,
  href,
}: {
  grant: {
    id: string;
    title: string;
    issuingBody: string;
    maxAmount: number | null;
    deadline: Date | null;
  };
  score: MatchScore;
  fetchExplanation?: () => Promise<{ paragraph: string }>;
  href: string;
}) {
  const [paragraph, setParagraph] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    if (!fetchExplanation) return;
    start(() => {
      fetchExplanation()
        .then((r) => setParagraph(r.paragraph))
        .catch(() => setParagraph(null));
    });
  }, [fetchExplanation]);

  return (
    <article className="rounded-lg border bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Link href={href} className="text-base font-semibold text-slate-900 hover:underline">
            {grant.title}
          </Link>
          <p className="text-sm text-slate-500">{grant.issuingBody}</p>
        </div>
        <MatchScoreBadge score={score.total} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-500">Importo max</dt>
          <dd className="font-medium">
            {grant.maxAmount ? `${grant.maxAmount.toLocaleString("it-IT")} EUR` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Scadenza</dt>
          <dd className="font-medium">
            {grant.deadline ? grant.deadline.toLocaleDateString("it-IT") : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <MatchChips chips={score.chips} />
      </div>

      {paragraph && <p className="mt-3 text-sm text-slate-700">{paragraph}</p>}

      <button
        type="button"
        onClick={() => setShowBreakdown((v) => !v)}
        className="mt-3 text-xs text-blue-600 hover:underline"
      >
        {showBreakdown ? "Nascondi breakdown" : "Mostra breakdown"}
      </button>
      {showBreakdown && (
        <div className="mt-2">
          <MatchBreakdown breakdown={score.breakdown} semanticScore={score.semanticScore} />
        </div>
      )}
    </article>
  );
}
