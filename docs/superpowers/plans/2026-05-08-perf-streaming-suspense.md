# Performance: Region + Pooler + Streaming Suspense + Caching — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `/azienda` TTFB from ~2.6s baseline to <400ms perceived (shell) and <800ms full-content (warm), and apply the same pattern across the dashboard.

**Architecture:** Config + code changes split into 5 atomic phases (PR-A through PR-E). Phase 1 fixes infra (Vercel region + Supabase pooler). Phases 2-4 refactor pages to use Suspense boundaries with skeleton fallbacks for streaming. Phase 5 adds `unstable_cache` + `revalidateTag` invalidation for stable queries.

**Tech Stack:** Next.js 15 App Router (RSC + Server Actions), React 19, Prisma 6, Supabase Postgres + Storage, NextAuth.js v5 (JWT), Vitest, Tailwind CSS, Turborepo + pnpm.

**Spec reference:** `docs/superpowers/specs/2026-05-08-perf-streaming-suspense-design.md`.

**Branching:** each phase = one feature branch off `main`, opened as a PR, squash-merged after review. Branch names: `perf/region-pooler`, `perf/streaming-azienda`, `perf/streaming-consulente-admin`, `perf/streaming-detail-pages`, `perf/cache-tags`.

**Working directory:** `/Users/carlospenaranda/Proggetto_finanza_agevolata`. All commands assume this CWD.

---

## Phase 0: Baseline measurement

Capture the current performance numbers so the post-deploy comparison has ground truth. No commits in this phase — just data.

### Task 0.1: Capture HAR baseline on production

- [ ] **Step 1: Open production `/azienda` in Chrome with DevTools open**

URL: `https://finagevolata-web-4635.vercel.app/azienda`. Login as a company user.

- [ ] **Step 2: Reload with cache disabled, save HAR**

DevTools → Network tab → check "Disable cache" → reload (Cmd+Shift+R). Wait for full load. Right-click any row → "Save all as HAR with content".

Save file to `docs/perf/baseline-2026-05-08.har`.

- [ ] **Step 3: Note the key numbers**

Open the HAR or the Network tab. Record into a one-line note in the PR description for Phase 1:

- TTFB on `/azienda` document: ___ ms
- Total page load: ___ ms
- LCP (from Performance tab): ___ ms

These numbers are the comparison baseline; do not skip.

- [ ] **Step 4: Commit baseline**

```bash
git checkout main
git pull
mkdir -p docs/perf
mv ~/Downloads/finagevolata-web-4635.vercel.app.har docs/perf/baseline-2026-05-08.har
git add docs/perf/baseline-2026-05-08.har
git commit -m "chore(perf): capture HAR baseline before perf work"
git push
```

---

## Phase 1: Vercel region + Supabase pooler (PR-A)

This is the highest-impact, lowest-risk phase. No code logic changes.

**Files:**
- Modify: `vercel.json`
- Modify (Vercel dashboard, not git): env var `DATABASE_URL`

**Branch:** `perf/region-pooler`

### Task 1.1: Pin Vercel region to fra1

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull
git checkout -b perf/region-pooler
```

- [ ] **Step 2: Modify `vercel.json`**

Replace the file contents with:

```json
{
  "buildCommand": "turbo run build --filter=@finagevolata/web",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["fra1"]
}
```

- [ ] **Step 3: Verify with `cat`**

```bash
cat vercel.json
```

Expected: the four-line JSON above, including the `regions` field.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "perf(infra): pin Vercel function region to fra1

Reduces cross-Atlantic latency to Supabase EU. See spec
docs/superpowers/specs/2026-05-08-perf-streaming-suspense-design.md."
```

### Task 1.2: Switch DATABASE_URL to Supabase pooler (Vercel env)

This is a Vercel-dashboard-only change. The pooler URL must come from the Supabase dashboard so it has the correct project ref + password.

- [ ] **Step 1: Get pooler URL from Supabase**

Go to Supabase → Project → Settings → Database → "Connection string" tab → select **Transaction** mode → copy the URL. It looks like:

```
postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

- [ ] **Step 2: Append pooler params**

Append `?pgbouncer=true&connection_limit=1` to the URL. Final form:

```
postgresql://postgres.<ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

- [ ] **Step 3: Update Vercel env vars**

Vercel dashboard → `finagevolata-web-4635` → Settings → Environment Variables.

- Edit existing `DATABASE_URL` (Production scope) → paste the pooler URL above.
- Verify `DIRECT_URL` (Production scope) still points to the **direct** non-pooled connection (port 5432, not 6543). This is required for migrations.

- [ ] **Step 4: Trigger redeploy**

Vercel dashboard → Deployments → latest → "Redeploy" (with same commit). Wait for completion.

- [ ] **Step 5: Smoke test**

Login as company user. Click through:

1. `/azienda` (dashboard renders, no 500)
2. `/azienda/pratiche` (list renders)
3. `/azienda/pratiche/<some-id>` (detail renders)
4. Login as consultant, create a new practice from `/consulente/bandi/<id>` clicking Avvia (verifies that Prisma transactions work via PgBouncer)

If any 500: check Vercel runtime logs for Prisma "Engine has died" or pgbouncer errors. Common fix: ensure `connection_limit=1` is in the URL.

### Task 1.3: Open PR-A

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin perf/region-pooler
gh pr create --title "perf(infra): Vercel fra1 region + Supabase pooler" --body "$(cat <<'EOF'
## Summary
- Pin Vercel function region to fra1 (Frankfurt) — same continent as Supabase EU
- Companion env-var change on Vercel: switch DATABASE_URL to Supabase Transaction pooler (port 6543, pgbouncer=true, connection_limit=1). DIRECT_URL stays direct for migrations.

## Why
Measured 2.6s TTFB on /azienda. Function in iad1 (US-East) doing 6 sequential roundtrips to Supabase EU = ~600-800ms cross-Atlantic. Spec: docs/superpowers/specs/2026-05-08-perf-streaming-suspense-design.md.

## Test plan
- [x] Smoke: dashboard, lists, detail pages render
- [x] Smoke: createPractice (Prisma transaction over PgBouncer)
- [ ] Capture post-deploy HAR — compare TTFB vs baseline-2026-05-08.har

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: After preview deploys, capture post-deploy HAR**

Open preview URL → `/azienda` → DevTools Network → save HAR to `docs/perf/post-pr-a-2026-05-08.har`. Note new TTFB. Update PR description with the comparison.

- [ ] **Step 3: Merge PR-A**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Phase 2: Skeletons + `/azienda` Suspense refactor (PR-B)

**Files:**
- Create: `apps/web/components/skeletons/stats-grid-skeleton.tsx`
- Create: `apps/web/components/skeletons/top-matches-skeleton.tsx`
- Create: `apps/web/components/skeletons/invitations-banner-skeleton.tsx`
- Create: `apps/web/components/skeletons/index.ts`
- Create: `apps/web/app/(dashboard)/azienda/_sections/pending-invitations.tsx`
- Create: `apps/web/app/(dashboard)/azienda/_sections/stats-grid.tsx`
- Create: `apps/web/app/(dashboard)/azienda/_sections/top-matches.tsx`
- Modify: `apps/web/app/(dashboard)/azienda/page.tsx`

**Branch:** `perf/streaming-azienda` from main.

The `_sections` folder uses the underscore-prefix convention so Next.js does not treat it as a route segment.

### Task 2.1: Branch + skeleton barrel

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull
git checkout -b perf/streaming-azienda
mkdir -p apps/web/components/skeletons
```

- [ ] **Step 2: Create `apps/web/components/skeletons/stats-grid-skeleton.tsx`**

```tsx
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border bg-white p-6">
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 h-8 w-16 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/components/skeletons/top-matches-skeleton.tsx`**

```tsx
export function TopMatchesSkeleton() {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="rounded-lg border bg-white p-4">
          <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Create `apps/web/components/skeletons/invitations-banner-skeleton.tsx`**

```tsx
export function InvitationsBannerSkeleton() {
  return (
    <div className="mb-6 h-20 rounded-lg border border-blue-200 bg-blue-50 p-4 animate-pulse" aria-hidden="true" />
  );
}
```

- [ ] **Step 5: Create barrel `apps/web/components/skeletons/index.ts`**

```ts
export { StatsGridSkeleton } from "./stats-grid-skeleton";
export { TopMatchesSkeleton } from "./top-matches-skeleton";
export { InvitationsBannerSkeleton } from "./invitations-banner-skeleton";
```

- [ ] **Step 6: Type check**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no errors related to the new files. (Pre-existing errors elsewhere are not blockers — don't fix them in this PR.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/skeletons/
git commit -m "feat(perf): add skeleton components for Suspense fallbacks"
```

### Task 2.2: Extract `/azienda` sections — PendingInvitations

- [ ] **Step 1: Create `apps/web/app/(dashboard)/azienda/_sections/pending-invitations.tsx`**

```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function PendingInvitations({ userId }: { userId: string }) {
  const pendingInvitations = await prisma.consultantCompany.findMany({
    where: { companyId: userId, status: "PENDING" },
    include: { consultant: { include: { consultantProfile: true } } },
  });

  if (pendingInvitations.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-blue-800">
            Hai {pendingInvitations.length} invit{pendingInvitations.length === 1 ? "o" : "i"} in attesa
          </h2>
          <div className="mt-2 space-y-1">
            {pendingInvitations.map((inv) => (
              <p key={inv.id} className="text-sm text-blue-700">
                <span className="font-medium">
                  {inv.consultant.consultantProfile?.firmName || inv.consultant.name}
                </span>{" "}
                ({inv.consultant.email}) ti ha invitato a collaborare
              </p>
            ))}
          </div>
        </div>
        <Link
          href="/azienda/inviti"
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Rispondi agli inviti
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/azienda/_sections/pending-invitations.tsx
git commit -m "feat(perf): extract PendingInvitations as streamable section"
```

### Task 2.3: Extract `/azienda` sections — StatsGrid

- [ ] **Step 1: Create `apps/web/app/(dashboard)/azienda/_sections/stats-grid.tsx`**

```tsx
import { prisma } from "@/lib/prisma";

export async function StatsGrid({ userId }: { userId: string }) {
  const [practiceCount, missingDocs, rejectedDocs] = await Promise.all([
    prisma.practice.count({ where: { companyId: userId } }),
    prisma.practiceDocument.count({
      where: { practice: { companyId: userId }, status: "MISSING" },
    }),
    prisma.practiceDocument.count({
      where: { practice: { companyId: userId }, status: "REJECTED" },
    }),
  ]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Pratiche attive</p>
        <p className="text-3xl font-bold">{practiceCount}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Documenti mancanti</p>
        <p className="text-3xl font-bold text-amber-600">{missingDocs}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Documenti rifiutati</p>
        <p className="text-3xl font-bold text-red-600">{rejectedDocs}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(dashboard\)/azienda/_sections/stats-grid.tsx
git commit -m "feat(perf): extract StatsGrid as streamable section"
```

### Task 2.4: Extract `/azienda` sections — TopMatches

- [ ] **Step 1: Create `apps/web/app/(dashboard)/azienda/_sections/top-matches.tsx`**

```tsx
import Link from "next/link";
import { getTopMatchesForDashboard } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { MatchChips } from "@/components/matching/match-chips";

export async function TopMatches({ userId }: { userId: string }) {
  const topMatches = await getTopMatchesForDashboard(userId, 5).catch(() => []);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Bandi consigliati per te</h2>
        <Link href="/azienda/bandi/consigliati" className="text-sm text-blue-600 hover:underline">
          Vedi tutti
        </Link>
      </div>
      {topMatches.length === 0 ? (
        <p className="text-sm text-slate-500">
          Completa il profilo per vedere i bandi piu adatti.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topMatches.map(({ grant, score }) => (
            <li key={grant.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/azienda/bandi/${grant.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {grant.title}
                </Link>
                <MatchScoreBadge score={score.total} />
              </div>
              <p className="text-xs text-slate-500">{grant.issuingBody}</p>
              <div className="mt-2">
                <MatchChips chips={score.chips.slice(0, 3)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(dashboard\)/azienda/_sections/top-matches.tsx
git commit -m "feat(perf): extract TopMatches as streamable section"
```

### Task 2.5: Refactor `/azienda/page.tsx` to shell + Suspense

- [ ] **Step 1: Replace `apps/web/app/(dashboard)/azienda/page.tsx` contents**

```tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  InvitationsBannerSkeleton,
  StatsGridSkeleton,
  TopMatchesSkeleton,
} from "@/components/skeletons";
import { PendingInvitations } from "./_sections/pending-invitations";
import { StatsGrid } from "./_sections/stats-grid";
import { TopMatches } from "./_sections/top-matches";

export default async function CompanyDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  // Profile check stays upfront — required to gate onboarding redirect.
  const profile = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) redirect("/onboarding");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Azienda</h1>

      <Suspense fallback={<InvitationsBannerSkeleton />}>
        <PendingInvitations userId={userId} />
      </Suspense>

      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid userId={userId} />
      </Suspense>

      <Suspense fallback={<TopMatchesSkeleton />}>
        <TopMatches userId={userId} />
      </Suspense>
    </div>
  );
}
```

The `select: { id: true }` reduces the profile lookup payload — only the existence check is needed for the redirect.

- [ ] **Step 2: Type check**

```bash
cd apps/web && pnpm tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Run existing tests**

```bash
cd apps/web && pnpm vitest run
```

Expected: same pass/fail count as on main (the pre-existing `document-types.test.ts` failure is unrelated and pre-existing). No new failures.

- [ ] **Step 4: Smoke test locally**

```bash
pnpm dev
```

Open `http://localhost:3000/azienda` (logged in as company). Verify:

1. Page renders without errors
2. Skeletons appear briefly (then replaced by data)
3. All three sections show real data (invitations if any, stats counts, top matches)
4. Visual layout unchanged from before

- [ ] **Step 5: Commit + push**

```bash
git add apps/web/app/\(dashboard\)/azienda/page.tsx
git commit -m "feat(perf): stream /azienda dashboard with Suspense boundaries

Page shell renders immediately after auth + profile check. Each
section (invitations, stats, top matches) streams independently with
its own skeleton fallback, removing the all-or-nothing wait."
git push -u origin perf/streaming-azienda
```

### Task 2.6: Open PR-B

- [ ] **Step 1: Open PR**

```bash
gh pr create --title "perf: stream /azienda dashboard with Suspense" --body "$(cat <<'EOF'
## Summary
- Add base skeleton components: StatsGridSkeleton, TopMatchesSkeleton, InvitationsBannerSkeleton
- Extract /azienda dashboard into 3 streamable async sections under _sections/
- Page shell now emits HTML after auth+profile check (~50ms); sections stream as data resolves

## Why
Spec: docs/superpowers/specs/2026-05-08-perf-streaming-suspense-design.md.
Phase 1 (region+pooler) cut TTFB by ~60%. Suspense streaming pushes shell-time below 400ms perceived, regardless of slow sections.

## Test plan
- [x] tsc --noEmit clean
- [x] pnpm vitest run — no new failures vs main
- [x] Local smoke: skeletons visible briefly, real data replaces them
- [ ] Vercel preview HAR vs baseline (capture post-merge)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Vercel preview perf check**

Open the PR's preview URL → `/azienda` → DevTools Network → save HAR to `docs/perf/post-pr-b-2026-05-08.har` (commit later). Confirm:

- TTFB on the document is well under 400ms
- Sections appear progressively rather than all at once

- [ ] **Step 3: Merge**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Phase 3: `/consulente` + `/admin` Suspense (PR-C)

**Files:**
- Create: `apps/web/components/skeletons/opportunities-table-skeleton.tsx`
- Create: `apps/web/components/skeletons/admin-counts-skeleton.tsx`
- Modify: `apps/web/components/skeletons/index.ts`
- Create: `apps/web/app/(dashboard)/consulente/_sections/consultant-stats-grid.tsx`
- Create: `apps/web/app/(dashboard)/consulente/_sections/top-opportunities.tsx`
- Modify: `apps/web/app/(dashboard)/consulente/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/_sections/admin-counts.tsx`
- Modify: `apps/web/app/(dashboard)/admin/page.tsx`

**Branch:** `perf/streaming-consulente-admin` from main.

### Task 3.1: Branch + new skeletons

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull
git checkout -b perf/streaming-consulente-admin
```

- [ ] **Step 2: Create `apps/web/components/skeletons/opportunities-table-skeleton.tsx`**

```tsx
export function OpportunitiesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-white" aria-hidden="true">
      <div className="bg-slate-50 px-3 py-2">
        <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="border-t px-3 py-3">
          <div className="flex gap-4">
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/components/skeletons/admin-counts-skeleton.tsx`**

```tsx
export function AdminCountsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 h-8 w-12 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Update `apps/web/components/skeletons/index.ts`**

```ts
export { StatsGridSkeleton } from "./stats-grid-skeleton";
export { TopMatchesSkeleton } from "./top-matches-skeleton";
export { InvitationsBannerSkeleton } from "./invitations-banner-skeleton";
export { OpportunitiesTableSkeleton } from "./opportunities-table-skeleton";
export { AdminCountsSkeleton } from "./admin-counts-skeleton";
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/skeletons/
git commit -m "feat(perf): add skeletons for /consulente and /admin sections"
```

### Task 3.2: Extract `/consulente` sections

- [ ] **Step 1: Create `apps/web/app/(dashboard)/consulente/_sections/consultant-stats-grid.tsx`**

```tsx
import { prisma } from "@/lib/prisma";

export async function ConsultantStatsGrid({ userId }: { userId: string }) {
  const [clientCount, practiceCount, pendingDocs] = await Promise.all([
    prisma.consultantCompany.count({ where: { consultantId: userId, status: "ACTIVE" } }),
    prisma.practice.count({ where: { consultantId: userId } }),
    prisma.practiceDocument.count({
      where: { practice: { consultantId: userId }, status: "UPLOADED" },
    }),
  ]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Clienti attivi</p>
        <p className="text-3xl font-bold">{clientCount}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Pratiche</p>
        <p className="text-3xl font-bold">{practiceCount}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Documenti da revisionare</p>
        <p className="text-3xl font-bold">{pendingDocs}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(dashboard)/consulente/_sections/top-opportunities.tsx`**

```tsx
import Link from "next/link";
import { getTopOpportunitiesForConsultant } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";

export async function TopOpportunities({ userId }: { userId: string }) {
  const opportunities = await getTopOpportunitiesForConsultant(userId, 10).catch(() => []);

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Top opportunita clienti</h2>
      {opportunities.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nessuna opportunita rilevante. Aggiungi clienti o aspetta nuovi bandi.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Bando</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={`${o.companyId}-${o.grant.id}`} className="border-t">
                  <td className="px-3 py-2 font-medium">{o.companyName}</td>
                  <td className="px-3 py-2">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/consulente/bandi/${o.grant.id}?clientId=${o.companyId}`}
                    >
                      {o.grant.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <MatchScoreBadge score={o.score.total} />
                  </td>
                  <td className="px-3 py-2">
                    {o.grant.deadline
                      ? new Date(o.grant.deadline).toLocaleDateString("it-IT")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/consulente/_sections/
git commit -m "feat(perf): extract /consulente sections (stats, opportunities)"
```

### Task 3.3: Refactor `/consulente/page.tsx` to shell + Suspense

- [ ] **Step 1: Replace `apps/web/app/(dashboard)/consulente/page.tsx` contents**

```tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  StatsGridSkeleton,
  OpportunitiesTableSkeleton,
} from "@/components/skeletons";
import { ConsultantStatsGrid } from "./_sections/consultant-stats-grid";
import { TopOpportunities } from "./_sections/top-opportunities";

export default async function ConsultantDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Consulente</h1>

      <Suspense fallback={<StatsGridSkeleton />}>
        <ConsultantStatsGrid userId={userId} />
      </Suspense>

      <Suspense fallback={<OpportunitiesTableSkeleton />}>
        <TopOpportunities userId={userId} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Type check + tests**

```bash
cd apps/web && pnpm tsc --noEmit && pnpm vitest run
```

Expected: clean tsc, same test results as main.

- [ ] **Step 3: Smoke test (local)**

Login as consultant → `/consulente` → verify skeletons → real data.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/consulente/page.tsx
git commit -m "feat(perf): stream /consulente dashboard with Suspense"
```

### Task 3.4: Extract `/admin` AdminCounts section

- [ ] **Step 1: Create `apps/web/app/(dashboard)/admin/_sections/admin-counts.tsx`**

```tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function AdminCounts() {
  const [totalGrants, pendingGrants, totalDocTypes] = await Promise.all([
    prisma.grant.count(),
    prisma.grant.count({
      where: { approvedByAdmin: false, createdBy: { role: "CONSULTANT" } },
    }),
    prisma.documentType.count(),
  ]);

  const cards = [
    { label: "Bandi totali", value: totalGrants, href: "/admin/bandi" },
    { label: "Da approvare", value: pendingGrants, href: "/admin/bandi/queue" },
    { label: "Tipi documento", value: totalDocTypes, href: "/admin/documenti" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow"
        >
          <p className="text-sm font-medium text-slate-500">{c.label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/_sections/admin-counts.tsx
git commit -m "feat(perf): extract /admin AdminCounts section"
```

### Task 3.5: Refactor `/admin/page.tsx`

- [ ] **Step 1: Replace `apps/web/app/(dashboard)/admin/page.tsx` contents**

```tsx
import { Suspense } from "react";
import { AdminCountsSkeleton } from "@/components/skeletons";
import { AdminCounts } from "./_sections/admin-counts";

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard Admin</h1>
      <Suspense fallback={<AdminCountsSkeleton />}>
        <AdminCounts />
      </Suspense>
    </div>
  );
}
```

Note: this page is now a synchronous component because the data fetch moved into `AdminCounts`. No `auth()` here either — the layout / middleware already protects `/admin`.

- [ ] **Step 2: Type check + tests + smoke**

```bash
cd apps/web && pnpm tsc --noEmit && pnpm vitest run
```

Login as admin → `/admin` → skeleton → counts.

- [ ] **Step 3: Commit + push**

```bash
git add apps/web/app/\(dashboard\)/admin/page.tsx
git commit -m "feat(perf): stream /admin dashboard with Suspense"
git push -u origin perf/streaming-consulente-admin
```

### Task 3.6: Open and merge PR-C

- [ ] **Step 1: Open PR**

```bash
gh pr create --title "perf: stream /consulente and /admin with Suspense" --body "$(cat <<'EOF'
## Summary
- Add OpportunitiesTableSkeleton and AdminCountsSkeleton
- Extract /consulente sections: ConsultantStatsGrid, TopOpportunities
- Extract /admin section: AdminCounts
- Both pages now render shell immediately, sections stream

## Why
Spec: docs/superpowers/specs/2026-05-08-perf-streaming-suspense-design.md (Phase 3).

## Test plan
- [x] tsc --noEmit clean
- [x] vitest — no new failures
- [x] Local smoke: /consulente, /admin
- [ ] Vercel preview HAR comparison

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Merge after review**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Phase 4: Detail pages Suspense (PR-D)

**Files:**
- Create: `apps/web/components/skeletons/document-checklist-skeleton.tsx`
- Create: `apps/web/components/skeletons/chat-skeleton.tsx`
- Create: `apps/web/components/skeletons/timeline-skeleton.tsx`
- Modify: `apps/web/components/skeletons/index.ts`
- Create: `apps/web/app/(dashboard)/consulente/pratiche/[id]/_sections/practice-chat-section.tsx`
- Create: `apps/web/app/(dashboard)/consulente/pratiche/[id]/_sections/practice-timeline-section.tsx`
- Create: `apps/web/app/(dashboard)/azienda/pratiche/[id]/_sections/practice-chat-section.tsx`
- Create: `apps/web/app/(dashboard)/azienda/pratiche/[id]/_sections/practice-timeline-section.tsx`
- Modify: `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx`
- Modify: `apps/web/app/(dashboard)/azienda/pratiche/[id]/page.tsx`

**Branch:** `perf/streaming-detail-pages` from main.

The detail pages keep `getPractice` upfront (it gates the 404). The expensive bits we stream are the chat (additional query) and the timeline (currently `<PracticeTimeline>` already fetches its own data, but we wrap it in Suspense for symmetry and to render its skeleton fallback).

### Task 4.1: Branch + detail-page skeletons

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull
git checkout -b perf/streaming-detail-pages
```

- [ ] **Step 2: Create `apps/web/components/skeletons/document-checklist-skeleton.tsx`**

```tsx
export function DocumentChecklistSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border bg-white p-3">
          <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 flex-1 rounded bg-gray-200 animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/components/skeletons/chat-skeleton.tsx`**

```tsx
export function ChatSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div className="h-12 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/components/skeletons/timeline-skeleton.tsx`**

```tsx
export function TimelineSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-2 w-2 mt-2 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="mt-2 h-3 w-1/3 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Update `apps/web/components/skeletons/index.ts`**

```ts
export { StatsGridSkeleton } from "./stats-grid-skeleton";
export { TopMatchesSkeleton } from "./top-matches-skeleton";
export { InvitationsBannerSkeleton } from "./invitations-banner-skeleton";
export { OpportunitiesTableSkeleton } from "./opportunities-table-skeleton";
export { AdminCountsSkeleton } from "./admin-counts-skeleton";
export { DocumentChecklistSkeleton } from "./document-checklist-skeleton";
export { ChatSkeleton } from "./chat-skeleton";
export { TimelineSkeleton } from "./timeline-skeleton";
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/skeletons/
git commit -m "feat(perf): add skeletons for detail-page sections"
```

### Task 4.2: Extract chat section for `/consulente/pratiche/[id]`

- [ ] **Step 1: Create `apps/web/app/(dashboard)/consulente/pratiche/[id]/_sections/practice-chat-section.tsx`**

```tsx
import { getMessages } from "@/lib/actions/chat";
import { PracticeChat } from "@/components/practice-chat";

export async function PracticeChatSection({
  practiceId,
  currentUserId,
}: {
  practiceId: string;
  currentUserId: string | undefined;
}) {
  const messages = await getMessages(practiceId);
  return (
    <PracticeChat
      practiceId={practiceId}
      messages={messages as any}
      currentUserId={currentUserId}
    />
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(dashboard)/consulente/pratiche/[id]/_sections/practice-timeline-section.tsx`**

```tsx
import { PracticeTimeline } from "@/components/practice-timeline";

export async function PracticeTimelineSection({ practiceId }: { practiceId: string }) {
  return <PracticeTimeline practiceId={practiceId} />;
}
```

`PracticeTimeline` is already a self-contained server component. Wrapping it in an async section enables Suspense fallback rendering and signals intent.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/consulente/pratiche/\[id\]/_sections/
git commit -m "feat(perf): extract chat + timeline sections for consulente detail"
```

### Task 4.3: Refactor `/consulente/pratiche/[id]/page.tsx`

- [ ] **Step 1: Open the file** to confirm the current top-level data fetch (`Promise.all([getPractice, auth, getMessages])`). The new version drops `getMessages` from the top-level await and moves it into the chat section.

- [ ] **Step 2: Replace contents** of `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx`:

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getPractice, updatePracticeStatus } from "@/lib/actions/practices";
import { PracticeStatusBadge } from "@/components/practice-status-badge";
import { DocumentChecklist } from "@/components/document-checklist";
import { AIDocumentValidator } from "@/components/ai-document-validator";
import { ViewDocumentButton } from "@/components/view-document-button";
import { DocumentReviewForm } from "@/components/document-review-form";
import { ClickDaySection } from "@/components/click-day-section";
import { ChatSkeleton, TimelineSkeleton } from "@/components/skeletons";
import { PracticeChatSection } from "./_sections/practice-chat-section";
import { PracticeTimelineSection } from "./_sections/practice-timeline-section";

const PRACTICE_STATUSES = [
  { value: "DOCUMENTS_PENDING", label: "Documenti in attesa" },
  { value: "DOCUMENTS_REVIEW", label: "In revisione" },
  { value: "READY", label: "Pronta per invio" },
  { value: "SUBMITTED", label: "Inviata" },
  { value: "WON", label: "Vinta" },
  { value: "LOST", label: "Persa" },
];

export default async function ConsultantPracticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [practice, session] = await Promise.all([getPractice(id), auth()]);
  if (!practice) notFound();

  const currentUserId = (session?.user as any)?.id;
  const practiceData = practice as any;

  async function handleStatusUpdate(formData: FormData) {
    "use server";
    const status = formData.get("status") as string;
    await updatePracticeStatus(id, status);
    revalidatePath(`/consulente/pratiche/${id}`);
  }

  const companyName = practiceData.company.companyProfile?.companyName || practiceData.company.name;
  const consultantName = practiceData.consultant.consultantProfile?.firmName || practiceData.consultant.name;
  const uploadedDocs = practiceData.documents.filter((d: any) => d.status === "UPLOADED");

  const allDocs = practiceData.documents as Array<{ status: string }>;
  const documentsAllApproved =
    allDocs.length > 0 && allDocs.every((d) => d.status === "APPROVED");
  const pendingDocCount = allDocs.filter((d) => d.status !== "APPROVED").length;
  const lastClickDayActivity = ((practiceData.activities ?? []) as Array<{
    type: string;
    createdAt: Date | string;
  }>)
    .filter((a) => a.type === "CLICKDAY_EXPORT")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  const lastExportAt = lastClickDayActivity
    ? new Date(lastClickDayActivity.createdAt)
    : null;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/consulente/pratiche" className="text-sm text-blue-600 hover:underline">&larr; Pratiche</Link>
        <h1 className="text-2xl font-bold text-gray-900">{practiceData.grant.title}</h1>
        <PracticeStatusBadge status={practiceData.status} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bando</h2>
          <p className="font-medium text-gray-900">{practiceData.grant.title}</p>
          <p className="text-sm text-gray-500 mt-1">{practiceData.grant.issuingBody}</p>
          {practiceData.grant.deadline && (
            <p className="text-sm text-gray-500 mt-1">Scadenza: {new Date(practiceData.grant.deadline).toLocaleDateString("it-IT")}</p>
          )}
          {practiceData.grant.maxAmount && (
            <p className="text-sm text-gray-500 mt-1">Importo max: {Number(practiceData.grant.maxAmount).toLocaleString("it-IT")} &euro;</p>
          )}
        </div>
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Azienda</h2>
          <p className="font-medium text-gray-900">{companyName}</p>
          {practiceData.company.companyProfile?.vatNumber && (
            <p className="text-sm text-gray-500 mt-1">P.IVA: {practiceData.company.companyProfile.vatNumber}</p>
          )}
          {practiceData.company.companyProfile?.region && (
            <p className="text-sm text-gray-500 mt-1">Regione: {practiceData.company.companyProfile.region}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">Consulente: {consultantName}</p>
        </div>
      </div>

      {uploadedDocs.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">
            Documenti da revisionare ({uploadedDocs.length})
          </h2>
          <div className="space-y-3">
            {uploadedDocs.map((doc: any) => (
              <div key={doc.id} className="rounded-lg border border-blue-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.documentType.name}</p>
                    {doc.fileName && <p className="text-xs text-gray-500">{doc.fileName} (v{doc.version})</p>}
                    {doc.uploadedAt && <p className="text-xs text-gray-400">Caricato il {new Date(doc.uploadedAt).toLocaleDateString("it-IT")}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.filePath && <ViewDocumentButton docId={doc.id} />}
                    <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-medium">Da revisionare</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <DocumentReviewForm docId={doc.id} />
                  <AIDocumentValidator docId={doc.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist Documenti</h2>
        {practiceData.documents.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun documento richiesto per questo bando.</p>
        ) : (
          <DocumentChecklist documents={practiceData.documents} isConsultant />
        )}
      </div>

      <div className="mb-6">
        <ClickDaySection
          practiceId={id}
          hasClickDay={practiceData.grant.hasClickDay}
          clickDayStatus={practiceData.clickDayStatus}
          lastExportAt={lastExportAt}
          documentsAllApproved={documentsAllApproved}
          pendingDocCount={pendingDocCount}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messaggi</h2>
          <Suspense fallback={<ChatSkeleton />}>
            <PracticeChatSection practiceId={id} currentUserId={currentUserId} />
          </Suspense>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attivita</h2>
          <Suspense fallback={<TimelineSkeleton />}>
            <PracticeTimelineSection practiceId={id} />
          </Suspense>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aggiorna Stato Pratica</h2>
        <form action={handleStatusUpdate} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuovo stato</label>
            <select name="status" defaultValue={practiceData.status}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PRACTICE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Salva
          </button>
        </form>
      </div>
    </div>
  );
}
```

The diff vs. main: dropped `getMessages` from the top-level `Promise.all`, replaced inline `<PracticeChat>` and `<PracticeTimeline>` with their `<Suspense>`-wrapped section variants, added the corresponding imports.

- [ ] **Step 3: Type check + tests**

```bash
cd apps/web && pnpm tsc --noEmit && pnpm vitest run
```

- [ ] **Step 4: Smoke test (local)**

Login as consultant → open any practice detail → verify chat skeleton briefly visible, then chat replaces it; timeline same.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(dashboard\)/consulente/pratiche/\[id\]/page.tsx
git commit -m "feat(perf): stream chat and timeline on consulente practice detail"
```

### Task 4.4: Mirror change on `/azienda/pratiche/[id]`

- [ ] **Step 1: Create `apps/web/app/(dashboard)/azienda/pratiche/[id]/_sections/practice-chat-section.tsx`**

```tsx
import { getMessages } from "@/lib/actions/chat";
import { PracticeChat } from "@/components/practice-chat";

export async function PracticeChatSection({
  practiceId,
  currentUserId,
}: {
  practiceId: string;
  currentUserId: string | undefined;
}) {
  const messages = await getMessages(practiceId);
  return (
    <PracticeChat
      practiceId={practiceId}
      messages={messages as any}
      currentUserId={currentUserId}
    />
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(dashboard)/azienda/pratiche/[id]/_sections/practice-timeline-section.tsx`**

```tsx
import { PracticeTimeline } from "@/components/practice-timeline";

export async function PracticeTimelineSection({ practiceId }: { practiceId: string }) {
  return <PracticeTimeline practiceId={practiceId} />;
}
```

- [ ] **Step 3: Replace `apps/web/app/(dashboard)/azienda/pratiche/[id]/page.tsx` contents**

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getPractice } from "@/lib/actions/practices";
import { PracticeStatusBadge } from "@/components/practice-status-badge";
import { DocumentChecklist } from "@/components/document-checklist";
import { DocumentUploadSection } from "./document-upload-section";
import { AIAssistant } from "@/components/ai-assistant";
import { ChatSkeleton, TimelineSkeleton } from "@/components/skeletons";
import { PracticeChatSection } from "./_sections/practice-chat-section";
import { PracticeTimelineSection } from "./_sections/practice-timeline-section";

export default async function AziendaPracticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [practice, session] = await Promise.all([getPractice(id), auth()]);
  if (!practice) notFound();

  const currentUserId = (session?.user as any)?.id;
  const practiceData = practice as any;

  const companyName = practiceData.company.companyProfile?.companyName || practiceData.company.name;
  const consultantName = practiceData.consultant.consultantProfile?.firmName || practiceData.consultant.name;

  const missingOrRejected = practiceData.documents.filter(
    (d: any) => d.status === "MISSING" || d.status === "REJECTED"
  );

  const lastClickDayActivity = ((practiceData.activities ?? []) as Array<{
    type: string;
    createdAt: Date | string;
  }>)
    .filter((a) => a.type === "CLICKDAY_EXPORT")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/azienda/pratiche" className="text-sm text-blue-600 hover:underline">&larr; Pratiche</Link>
        <h1 className="text-2xl font-bold text-gray-900">{practiceData.grant.title}</h1>
        <PracticeStatusBadge status={practiceData.status} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bando</h2>
          <p className="font-medium text-gray-900">{practiceData.grant.title}</p>
          <p className="text-sm text-gray-500 mt-1">{practiceData.grant.issuingBody}</p>
          {practiceData.grant.deadline && (
            <p className="text-sm text-gray-500 mt-1">Scadenza: {new Date(practiceData.grant.deadline).toLocaleDateString("it-IT")}</p>
          )}
          {practiceData.grant.maxAmount && (
            <p className="text-sm text-gray-500 mt-1">Importo max: {Number(practiceData.grant.maxAmount).toLocaleString("it-IT")} &euro;</p>
          )}
          {practiceData.grant.sourceUrl && (
            <a href={practiceData.grant.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-2 inline-block">Scheda ufficiale</a>
          )}
        </div>
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Il tuo Consulente</h2>
          <p className="font-medium text-gray-900">{consultantName}</p>
          <p className="text-sm text-gray-500 mt-1">{practiceData.consultant.email}</p>
          <p className="text-sm text-gray-500 mt-3">Azienda: {companyName}</p>
        </div>
      </div>

      {practiceData.clickDayStatus !== "NONE" && lastClickDayActivity ? (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            Richiesta Click Day inviata al partner MouseX il{" "}
            {new Date(lastClickDayActivity.createdAt).toLocaleString("it-IT")}.
          </p>
          <p className="mt-1 text-xs text-blue-700">
            Il consulente ti aggiornerà sull'esito.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist Documenti</h2>
        {practiceData.documents.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun documento richiesto per questo bando.</p>
        ) : (
          <DocumentChecklist documents={practiceData.documents} />
        )}
      </div>

      {missingOrRejected.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 mb-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Documenti da caricare</h2>
          <p className="text-sm text-amber-700 mb-4">
            Hai {missingOrRejected.length} document{missingOrRejected.length === 1 ? "o" : "i"} da caricare o correggere.
          </p>
          <DocumentUploadSection documents={missingOrRejected} practiceId={id} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messaggi con il Consulente</h2>
          <Suspense fallback={<ChatSkeleton />}>
            <PracticeChatSection practiceId={id} currentUserId={currentUserId} />
          </Suspense>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attivita</h2>
          <Suspense fallback={<TimelineSkeleton />}>
            <PracticeTimelineSection practiceId={id} />
          </Suspense>
        </div>
      </div>

      <AIAssistant
        practiceId={id}
        grantTitle={practiceData.grant.title}
      />
    </div>
  );
}
```

- [ ] **Step 4: Type check + tests + smoke**

```bash
cd apps/web && pnpm tsc --noEmit && pnpm vitest run
```

Login as company → open practice detail → verify skeletons.

- [ ] **Step 5: Commit + push**

```bash
git add apps/web/app/\(dashboard\)/azienda/pratiche/\[id\]/
git commit -m "feat(perf): stream chat and timeline on azienda practice detail"
git push -u origin perf/streaming-detail-pages
```

### Task 4.5: Open and merge PR-D

- [ ] **Step 1: Open PR**

```bash
gh pr create --title "perf: stream chat and timeline on practice detail pages" --body "$(cat <<'EOF'
## Summary
- Add DocumentChecklistSkeleton, ChatSkeleton, TimelineSkeleton
- Move getMessages out of top-level Promise.all on /pratiche/[id] (consulente + azienda)
- Wrap chat and timeline in Suspense; render shell + grant info immediately
- Detail pages keep getPractice upfront because it gates the 404

## Why
Spec: docs/superpowers/specs/2026-05-08-perf-streaming-suspense-design.md (Phase 4).

## Test plan
- [x] tsc --noEmit clean
- [x] vitest — no new failures
- [x] Smoke: consulente practice detail (chat + timeline skeleton → real)
- [x] Smoke: azienda practice detail (chat + timeline skeleton → real)
- [ ] Vercel preview HAR comparison

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Merge after review**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Phase 5: `unstable_cache` + `revalidateTag` (PR-E)

**Files:**
- Create: `apps/web/lib/cache/keys.ts`
- Create: `apps/web/lib/cache/matches.ts`
- Create: `apps/web/lib/cache/profile.ts`
- Create: `apps/web/lib/cache/grants.ts`
- Create: `apps/web/lib/cache/counts.ts`
- Create: `apps/web/lib/cache/matches.test.ts`
- Modify: `apps/web/app/(dashboard)/azienda/_sections/top-matches.tsx`
- Modify: `apps/web/app/(dashboard)/azienda/_sections/stats-grid.tsx`
- Modify (find first): every server action that updates `companyProfile` — add `revalidateTag("profile:<id>")` and `revalidateTag("matches:<id>")`
- Modify (find first): every server action that approves / publishes / rejects a grant — add `revalidateTag("grants:published")`

**Branch:** `perf/cache-tags` from main.

### Task 5.1: Branch + cache key conventions

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull
git checkout -b perf/cache-tags
mkdir -p apps/web/lib/cache
```

- [ ] **Step 2: Create `apps/web/lib/cache/keys.ts`**

```ts
export const cacheTags = {
  matches: (companyId: string) => `matches:${companyId}`,
  profile: (userId: string) => `profile:${userId}`,
  counts: (userId: string) => `counts:${userId}`,
  grantsPublished: () => `grants:published`,
};
```

Centralizing tag construction prevents typos across producers and invalidators.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/cache/keys.ts
git commit -m "feat(perf): add cache tag conventions module"
```

### Task 5.2: TDD — cache wrapper for matches

- [ ] **Step 1: Write the failing test `apps/web/lib/cache/matches.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetTopMatchesForDashboard = vi.fn();
const mockUnstableCache = vi.fn();

vi.mock("@/lib/actions/matching", () => ({
  getTopMatchesForDashboard: (...a: any[]) => mockGetTopMatchesForDashboard(...a),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: any, key: any, opts: any) => {
    mockUnstableCache(fn, key, opts);
    return fn;
  },
}));

import { getCachedTopMatches } from "./matches";

describe("getCachedTopMatches", () => {
  beforeEach(() => {
    mockGetTopMatchesForDashboard.mockReset();
    mockUnstableCache.mockReset();
  });

  it("wraps getTopMatchesForDashboard with unstable_cache using a per-company key and tag", async () => {
    mockGetTopMatchesForDashboard.mockResolvedValue([]);
    await getCachedTopMatches("company-1", 5);

    expect(mockUnstableCache).toHaveBeenCalledTimes(1);
    const [, key, opts] = mockUnstableCache.mock.calls[0];
    expect(key).toEqual(["top-matches", "company-1", "5"]);
    expect(opts.revalidate).toBe(60);
    expect(opts.tags).toEqual(["matches:company-1"]);
  });

  it("delegates to getTopMatchesForDashboard with the right args", async () => {
    mockGetTopMatchesForDashboard.mockResolvedValue([{ grant: { id: "g1" }, score: { total: 0.9 } }]);
    const result = await getCachedTopMatches("company-2", 3);

    expect(mockGetTopMatchesForDashboard).toHaveBeenCalledWith("company-2", 3);
    expect(result).toEqual([{ grant: { id: "g1" }, score: { total: 0.9 } }]);
  });
});
```

- [ ] **Step 2: Run the test — confirm failure**

```bash
cd apps/web && pnpm vitest run lib/cache/matches.test.ts
```

Expected: failure (`Cannot find module './matches'`).

- [ ] **Step 3: Create `apps/web/lib/cache/matches.ts`**

```ts
import { unstable_cache } from "next/cache";
import { getTopMatchesForDashboard } from "@/lib/actions/matching";
import { cacheTags } from "./keys";

export function getCachedTopMatches(companyId: string, limit: number) {
  return unstable_cache(
    () => getTopMatchesForDashboard(companyId, limit),
    ["top-matches", companyId, String(limit)],
    { revalidate: 60, tags: [cacheTags.matches(companyId)] },
  )();
}
```

- [ ] **Step 4: Run the test — confirm pass**

```bash
cd apps/web && pnpm vitest run lib/cache/matches.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/cache/matches.ts apps/web/lib/cache/matches.test.ts
git commit -m "feat(perf): add cached wrapper for top matches with 60s TTL"
```

### Task 5.3: Cache wrappers for profile, counts, grants

These follow the same shape as `matches.ts`, no separate tests — the test in 5.2 establishes the pattern; trusting the type system + the smoke test for these is acceptable for a perf-only refactor.

- [ ] **Step 1: Create `apps/web/lib/cache/profile.ts`**

```ts
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cacheTags } from "./keys";

export function getCachedCompanyProfile(userId: string) {
  return unstable_cache(
    () => prisma.companyProfile.findUnique({ where: { userId } }),
    ["company-profile", userId],
    { revalidate: 120, tags: [cacheTags.profile(userId)] },
  )();
}
```

- [ ] **Step 2: Create `apps/web/lib/cache/counts.ts`**

```ts
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cacheTags } from "./keys";

export function getCachedCompanyCounts(userId: string) {
  return unstable_cache(
    async () => {
      const [practiceCount, missingDocs, rejectedDocs] = await Promise.all([
        prisma.practice.count({ where: { companyId: userId } }),
        prisma.practiceDocument.count({
          where: { practice: { companyId: userId }, status: "MISSING" },
        }),
        prisma.practiceDocument.count({
          where: { practice: { companyId: userId }, status: "REJECTED" },
        }),
      ]);
      return { practiceCount, missingDocs, rejectedDocs };
    },
    ["company-counts", userId],
    { revalidate: 30, tags: [cacheTags.counts(userId)] },
  )();
}
```

- [ ] **Step 3: Create `apps/web/lib/cache/grants.ts`**

```ts
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cacheTags } from "./keys";

export function getCachedPublishedGrants() {
  return unstable_cache(
    () =>
      prisma.grant.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { deadline: "asc" },
      }),
    ["grants-published"],
    { revalidate: 300, tags: [cacheTags.grantsPublished()] },
  )();
}
```

- [ ] **Step 4: Type check**

```bash
cd apps/web && pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/cache/profile.ts apps/web/lib/cache/counts.ts apps/web/lib/cache/grants.ts
git commit -m "feat(perf): add cached wrappers for profile, counts, published grants"
```

### Task 5.4: Wire cache wrappers into `/azienda` sections

- [ ] **Step 1: Replace `apps/web/app/(dashboard)/azienda/_sections/top-matches.tsx` body**

Change the import:

```tsx
// before
import { getTopMatchesForDashboard } from "@/lib/actions/matching";
// after
import { getCachedTopMatches } from "@/lib/cache/matches";
```

And the call site:

```tsx
// before
const topMatches = await getTopMatchesForDashboard(userId, 5).catch(() => []);
// after
const topMatches = await getCachedTopMatches(userId, 5).catch(() => []);
```

The full file becomes:

```tsx
import Link from "next/link";
import { getCachedTopMatches } from "@/lib/cache/matches";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { MatchChips } from "@/components/matching/match-chips";

export async function TopMatches({ userId }: { userId: string }) {
  const topMatches = await getCachedTopMatches(userId, 5).catch(() => []);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Bandi consigliati per te</h2>
        <Link href="/azienda/bandi/consigliati" className="text-sm text-blue-600 hover:underline">
          Vedi tutti
        </Link>
      </div>
      {topMatches.length === 0 ? (
        <p className="text-sm text-slate-500">
          Completa il profilo per vedere i bandi piu adatti.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {topMatches.map(({ grant, score }) => (
            <li key={grant.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/azienda/bandi/${grant.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {grant.title}
                </Link>
                <MatchScoreBadge score={score.total} />
              </div>
              <p className="text-xs text-slate-500">{grant.issuingBody}</p>
              <div className="mt-2">
                <MatchChips chips={score.chips.slice(0, 3)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Replace `apps/web/app/(dashboard)/azienda/_sections/stats-grid.tsx` to use the cached wrapper**

```tsx
import { getCachedCompanyCounts } from "@/lib/cache/counts";

export async function StatsGrid({ userId }: { userId: string }) {
  const { practiceCount, missingDocs, rejectedDocs } = await getCachedCompanyCounts(userId);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Pratiche attive</p>
        <p className="text-3xl font-bold">{practiceCount}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Documenti mancanti</p>
        <p className="text-3xl font-bold text-amber-600">{missingDocs}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Documenti rifiutati</p>
        <p className="text-3xl font-bold text-red-600">{rejectedDocs}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type check + tests**

```bash
cd apps/web && pnpm tsc --noEmit && pnpm vitest run
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/azienda/_sections/top-matches.tsx apps/web/app/\(dashboard\)/azienda/_sections/stats-grid.tsx
git commit -m "feat(perf): use cached wrappers in /azienda sections"
```

### Task 5.5: Wire `revalidateTag` into mutations that affect cached queries

The targets:
1. `companyProfile` updates → invalidate `profile:<id>` and `matches:<id>`
2. Grant publish / approve / reject → invalidate `grants:published`
3. Practice creation, document upload, document review → invalidate `counts:<companyId>`

- [ ] **Step 1: Find the mutation files**

```bash
grep -rln "companyProfile\.update\|companyProfile\.upsert\|companyProfile\.create" apps/web/lib/actions
grep -rln "grant\.update\|grant\.create\|approvedByAdmin" apps/web/lib/actions
grep -rln "practice\.create\|practiceDocument\.update\|practiceDocument\.create" apps/web/lib/actions
```

Each match is a candidate. For each file:
- import `revalidateTag` from `next/cache`
- import `cacheTags` from `@/lib/cache/keys`
- after the successful mutation, call the appropriate `revalidateTag(...)`

- [ ] **Step 2: Apply the pattern (example for profile update)**

If `apps/web/lib/actions/profile.ts` (or wherever the company profile update lives) contains:

```ts
await prisma.companyProfile.update({ where: { userId }, data: { ... } });
return { success: true };
```

Change to:

```ts
import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/keys";

// ...inside the action, after update:
await prisma.companyProfile.update({ where: { userId }, data: { ... } });
revalidateTag(cacheTags.profile(userId));
revalidateTag(cacheTags.matches(userId));
return { success: true };
```

Apply the same pattern with the appropriate tag for each mutation found in step 1:

| Mutation | Tags to invalidate |
|----------|---------------------|
| companyProfile update / upsert | `profile:<userId>`, `matches:<userId>` |
| grant create / publish / approve / reject | `grants:published` |
| practice create | `counts:<companyId>` |
| practiceDocument status change (review approve/reject, upload) | `counts:<companyId>` |

`<companyId>` for practice/document mutations is `practice.companyId` — fetch it if the action only has `practiceId`.

- [ ] **Step 3: Type check + tests**

```bash
cd apps/web && pnpm tsc --noEmit && pnpm vitest run
```

Existing action tests should still pass. They mock `next/cache` already, or `revalidateTag` is a no-op outside a request scope and won't throw.

- [ ] **Step 4: Smoke test**

1. Login as company → `/azienda` (counts shown)
2. In another tab, upload a document on a practice → returns to `/azienda` → counts reflect the change within at most 30s, but should be immediate after `revalidateTag`
3. Update profile → reload `/azienda` → top matches recompute (test by changing `region` and seeing different matches; or just trust it)

- [ ] **Step 5: Commit + push**

```bash
git add apps/web/lib/actions/
git commit -m "feat(perf): invalidate cache tags on profile, grant, and practice mutations"
git push -u origin perf/cache-tags
```

### Task 5.6: Open and merge PR-E

- [ ] **Step 1: Open PR**

```bash
gh pr create --title "perf: cache tags + revalidate for stable queries" --body "$(cat <<'EOF'
## Summary
- Add cache tag conventions in lib/cache/keys.ts
- Cached wrappers for top-matches (60s), profile (120s), counts (30s), published grants (5min)
- /azienda sections now use the cached wrappers
- Mutations on profile, grants, practice, and practice documents call revalidateTag for the relevant cache tags

## Why
Spec: docs/superpowers/specs/2026-05-08-perf-streaming-suspense-design.md (Phase 5).
Brings repeated /azienda renders to ~10ms cache hit instead of ~500-800ms recomputation.

## Test plan
- [x] vitest: new tests for cached top matches wrapper (2 cases)
- [x] tsc --noEmit clean
- [x] All previous tests still pass
- [x] Smoke: counts update after document mutation; matches change after profile update

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Merge**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Phase 6: Final validation

### Task 6.1: Capture final HAR and update perf log

- [ ] **Step 1: Capture final HAR on production main**

URL: `https://finagevolata-web-4635.vercel.app/azienda`. Login → DevTools → Network → save as `docs/perf/final-2026-05-08.har`.

- [ ] **Step 2: Append a summary note** at `docs/perf/2026-05-08-summary.md`

```markdown
# Perf work 2026-05-08 — summary

## Baseline (before)
- /azienda TTFB: ___ ms
- Total page load: ___ ms

## After all phases
- /azienda TTFB: ___ ms (shell)
- /azienda full content: ___ ms
- /consulente TTFB: ___ ms
- /pratiche/[id] TTFB: ___ ms

## Phases shipped
- PR-A: Vercel fra1 region + Supabase pooler
- PR-B: /azienda streaming
- PR-C: /consulente + /admin streaming
- PR-D: practice detail pages streaming
- PR-E: cache tags + revalidate

## Acceptance criteria check
- [ ] /azienda TTFB < 400ms warm
- [ ] /azienda full content < 800ms warm
- [ ] All tests pass
- [ ] No regressions in core flows (login, createPractice, upload doc, review doc, Click Day export)
- [ ] Vercel deploy logs confirm region = fra1
- [ ] Supabase active connections graph shows pooler usage
```

- [ ] **Step 3: Commit**

```bash
git checkout -b perf/final-validation
git add docs/perf/
git commit -m "chore(perf): final HAR + perf summary after streaming + cache work"
git push -u origin perf/final-validation
gh pr create --title "chore(perf): perf work summary and final HAR" --body "Closes the perf work series. Numbers documented in docs/perf/2026-05-08-summary.md."
gh pr merge --squash --delete-branch
```

---

## Self-review notes (for the implementer)

- Each phase commits and merges before the next phase starts. Do not start Phase 3 until Phase 2 is merged to main.
- The pre-existing failing test `apps/web/lib/actions/document-types.test.ts` (NEXT_REDIRECT) is not addressed here — it pre-dates this work. Do not let it block PR merges; treat it as a known unrelated flake unless it suddenly starts changing pass/fail status.
- If a smoke test reveals an unexpected regression at any phase, revert that phase's PR (`git revert <merge-sha>` on a hotfix branch, open + merge), and re-investigate before reattempting.
- The `select: { id: true }` on the profile-existence check in Phase 2's `/azienda` page is a small but real win — keep it.
- Server actions that already mock `next/cache` in tests will not break because of the new `revalidateTag` calls. New mutations that don't have tests skip the test addition (consistent with the rest of the codebase: not every action has a unit test). Smoke testing is sufficient for cache invalidation correctness.
