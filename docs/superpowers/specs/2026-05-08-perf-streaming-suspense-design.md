# Performance: Region + Pooler + Streaming Suspense + Caching

**Date:** 2026-05-08
**Author:** Carlos Peñaranda (with Claude)
**Status:** Approved — ready for implementation plan

---

## Goal

Reduce perceived load time across the FinAgevolata dashboard from a measured TTFB of ~2.6s on `/azienda` to **<400ms perceived (shell)** and **<800ms full content** on warm requests.

Make the portal feel "fluid" rather than "everything loads at the same time."

## Problem (measured)

ChatGPT HAR analysis on `/azienda`:

- TTFB ~2634ms
- Total request ~3.1s
- Static assets fast (~140-220ms)
- Bottleneck: server-side rendering before HTML emitted

## Root causes identified (code audit)

| # | Cause | Estimated impact |
|---|-------|------------------|
| 1 | Vercel function region `iad1` (US East) ≠ Supabase EU region | 600-800ms (6 queries × ~100ms cross-Atlantic) |
| 2 | Prisma uses direct connection, no Supabase PgBouncer pooler | 200-500ms cold-start DB connection |
| 3 | `/azienda/page.tsx`: `auth()` then `profile` lookup serial before `Promise.all` | ~200ms |
| 4 | No Suspense / streaming — page awaits all queries before HTML emitted | 100% perceived as wait |
| 5 | No server-side caching — `topMatches` recomputed every render (raw SQL + scoring) | 200-800ms |
| 6 | `getTopMatchesForDashboard` runs raw SQL queries + scoring synchronously | 200-500ms |

Already correct (no change needed):
- Promise.all already used for the bulk of `/azienda` queries
- NextAuth JWT session strategy (no DB on session check)
- Middleware is lightweight (edge, JWT only)

## Out of scope

- Bundle size optimization, dynamic imports, image optimization (defer to a separate audit if needed)
- Database `@@index` additions (defer; current bottleneck is network + serial fetch, not query time)
- Bandi list page redesign
- Mobile-specific optimizations

## Architecture: 4-section design

### §1 — Infra changes (foundation)

**File:** `vercel.json` — add `"regions": ["fra1"]` (Frankfurt, near Supabase EU).

```json
{
  "buildCommand": "turbo run build --filter=@finagevolata/web",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["fra1"]
}
```

**Vercel env vars:**

- `DATABASE_URL` → Supabase pooled connection:
  `postgresql://postgres.<ref>:<pwd>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
- `DIRECT_URL` → unchanged (direct connection for Prisma migrations / introspect)

`connection_limit=1` is required by PgBouncer transaction-mode pooling with Prisma per Supabase docs.

**Code change on `/azienda/page.tsx`:** keep current logic (already mostly correct). The serial `profile` lookup before Promise.all stays — necessary for the redirect-to-onboarding decision. Region + pooler fix dominates the win.

**Expected impact §1:** TTFB ~2.6s → ~1.0-1.2s (~60% reduction), no UX changes.

### §2 — Streaming Suspense architecture

Refactor target pages so the page shell renders immediately (auth + structural HTML), and heavy data sections stream in via `<Suspense>` boundaries with skeleton fallbacks.

**Pages to refactor:**

| Page | Section split |
|------|--------------|
| `/azienda` | Shell + `<PendingInvitations>` + `<StatsGrid>` + `<TopMatches>` |
| `/consulente` | Shell + `<StatsGrid>` + `<RecentPractices>` (or whatever the page has) |
| `/admin` | Shell + `<CountsGrid>` + `<RecentActivity>` |
| `/consulente/pratiche/[id]` | Shell + grant info + `<DocumentsChecklist>` + `<Chat>` + `<Timeline>` + `<AIAssistant>` (lazy) |
| `/azienda/pratiche/[id]` | Shell + grant info + `<DocumentsChecklist>` + `<Chat>` + `<Timeline>` |

**Refactor pattern (example `/azienda`):**

```tsx
// page.tsx — shell, no heavy awaits
export default async function CompanyDashboard() {
  const session = await auth(); // ~5ms JWT only
  const userId = (session?.user as any)?.id;
  if (!userId) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard Azienda</h1>
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

Each section is its own async server component that fetches its own data (no prop-drilling of data).

**Profile redirect handling:** the existing `if (!profile) redirect("/onboarding")` check stays as a single quick query upfront on `/azienda` — it is required before rendering the dashboard. Single indexed query (~50ms). Acceptable.

**Skeletons to create** (`apps/web/components/skeletons/`):

- `stats-grid-skeleton.tsx` — 3 grey boxes
- `top-matches-skeleton.tsx` — 3-5 grey cards
- `invitations-banner-skeleton.tsx`
- `document-checklist-skeleton.tsx`
- `chat-skeleton.tsx` — 3-4 message stubs
- `timeline-skeleton.tsx` — 4-5 row stubs
- `index.ts` — barrel export

Use Tailwind: `animate-pulse bg-gray-200 rounded` shimmer pattern.

**Expected impact §2:** TTFB → ~150-300ms (shell), full content streamed as ready.

### §3 — Caching strategy

Wrap stable / costly queries with `unstable_cache`, invalidate via `revalidateTag` on mutations.

| Query | TTL | Tag |
|-------|-----|-----|
| `topMatches` per company | 60s | `matches:${companyId}` |
| `getPublishedGrants` (public list) | 300s | `grants:published` |
| `companyProfile` per userId | 120s | `profile:${userId}` |
| Counts grid (`practiceCount`, `missingDocs`, `rejectedDocs`) | 30s | `counts:${userId}` |

**Wrapper pattern:**

```ts
// lib/cache/matches.ts
import { unstable_cache } from "next/cache";

export const getCachedTopMatches = (companyId: string, limit: number) =>
  unstable_cache(
    () => getTopMatchesForDashboard(companyId, limit),
    ["top-matches", companyId, String(limit)],
    { revalidate: 60, tags: [`matches:${companyId}`] },
  )();
```

**Invalidation on mutation:**

```ts
// after updateCompanyProfile
revalidateTag(`profile:${userId}`);
revalidateTag(`matches:${userId}`);

// after admin approves a grant
revalidateTag("grants:published");
// matches:* fan-out across companies is skipped — 60s TTL is acceptable staleness
```

**Decision:** TTL-only invalidation for `matches:*`. No fan-out across companies — too costly, and 60s staleness is acceptable.

**Never cache** (freshness > speed):
- Practice detail data (documents, chat, timeline) on `/pratiche/[id]`
- Chat messages
- Activity timeline
- Pending invitations (reactivity required)

So `unstable_cache` does NOT apply to detail pages. Only dashboard root pages benefit from it.

**Expected impact §3:** `topMatches` ~500-800ms → ~10ms cache hit. Counts ~300ms → ~5ms cache hit.

### §4 — Validation & rollout

**Baseline measurement (before changes):**

- Tool: Vercel Speed Insights (free) + Chrome DevTools HAR
- Pages: `/azienda`, `/consulente`, `/azienda/pratiche/[id]`
- 3 cold + 3 warm samples each
- Metrics: TTFB, LCP, FCP, total page load
- Save HAR snapshot to `docs/perf/baseline-2026-05-08.har`

**Local perf testing:**
- `pnpm build && pnpm start` (production mode, no dev overhead)
- Chrome DevTools throttling: "Fast 4G"
- Compare local vs Vercel deployed numbers

**Rollout — phased PRs (no big-bang):**

| Phase | Scope | PR # |
|-------|-------|------|
| 1 | `vercel.json` regions + Supabase pooler URL | PR-A |
| 2 | Skeleton components + `/azienda` Suspense refactor | PR-B |
| 3 | `/consulente` + `/admin` Suspense refactor | PR-C |
| 4 | Detail pages `/pratiche/[id]` Suspense refactor | PR-D |
| 5 | `unstable_cache` wrappers + `revalidateTag` hooks | PR-E |

**Per-PR verification:**
- All existing tests pass (`pnpm test`)
- Type check (`pnpm tsc --noEmit`)
- Manual smoke test of modified pages (login as company + as consultant + as admin)
- Vercel preview perf check vs baseline

**Risks + mitigation:**

| Risk | Mitigation |
|------|------------|
| Region change adds latency to non-Supabase services (Resend, OpenAI) | Both are global, not region-specific — no impact. Verified post-PR-A. |
| PgBouncer transaction-mode breaks Prisma multi-statement transactions | Keep `DIRECT_URL` for migrations. App uses pooler `DATABASE_URL`. Smoke test: `createPractice` (uses Prisma transaction). |
| Suspense streaming breaks SEO bots that don't await streams | Dashboard is auth-gated, no SEO concern. |
| `unstable_cache` returns stale data after mutation | `revalidateTag` invalidates on hot mutation paths (profile update, grant approve). Stale window for `matches:*` capped at 60s — acceptable. |
| Vercel cache cold per region/instance | Vercel cache is per-region. After warm-up, hit ratio still beats cold-start. Measure post-deploy. |

**Rollback plan:** each PR atomic. `git revert` if a regression appears in preview perf.

## Acceptance criteria

- `/azienda` TTFB on warm Vercel preview drops below 400ms (down from ~2.6s baseline)
- `/azienda` full-content load below 800ms (warm)
- All existing tests pass
- No regressions in core flows: login, create practice, upload document, review document, send Click Day request
- Vercel function region confirmed `fra1` in deploy logs
- Supabase connection pooler in use (verifiable in Supabase dashboard "Active connections" graph)

## Open questions

None — ready for plan.

## Next step

Invoke `superpowers:writing-plans` to produce phased implementation plan with code blocks per task.
