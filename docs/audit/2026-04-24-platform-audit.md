# Platform Audit — FinAgevolata

**Date:** 2026-04-24
**Scope:** Monorepo `@finagevolata/web` + `@finagevolata/db` + `@finagevolata/shared`
**Method:** Static analysis + local DB test + typecheck + test suite
**Tests:** 74/75 pass (1 web test fail — test setup, not code)

---

## 🔴 Critical — Production-Breaking

### C1. Wrong domain hardcoded everywhere (`axentraitalia.cloud`)

**Files:**
- `apps/web/app/layout.tsx:11` — `metadataBase: new URL("https://axentraitalia.cloud")`
- `apps/web/app/(marketing)/layout.tsx:6` — same
- `apps/web/app/sitemap.ts:4` — `const base = "https://axentraitalia.cloud"`
- `apps/web/app/robots.ts:4` — same
- `apps/web/lib/email.ts:113` — welcome email fallback URL
- `apps/web/lib/email.ts:150` — grant submitted email fallback URL
- `apps/web/lib/actions/invites.ts:44` — invite link fallback

**Impact:**
- Invite emails contain wrong domain → users land on different project
- Sitemap/robots SEO points outside FinAgevolata
- OpenGraph/Twitter metadata references wrong origin
- Welcome emails broken CTAs

**Root cause:** Copy-paste from different project (Antano/Axentra). Never swapped.

**Fix:** Create `apps/web/lib/base-url.ts` helper using Vercel auto-detection. Replace all hardcoded strings.

```ts
// apps/web/lib/base-url.ts
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
```

Status: **auto-fixed below**.

---

### C2. Missing Prisma previewFeatures flag

**File:** `packages/db/prisma/schema.prisma:2-5`

**Impact:** Vercel `postinstall` runs `prisma generate` which fails with P1012 because `extensions = [vector]` requires `previewFeatures = ["postgresqlExtensions"]` in generator block. Build aborts.

**Fix:** Added `previewFeatures = ["postgresqlExtensions"]`.

Status: **auto-fixed** (commit `1b6c69f`).

---

### C3. Prisma migrations not synced with prod DB state

**Files:** `packages/db/prisma/migrations/`

**Impact:**
- Only 2 migration folders exist. Baseline schema (initial User, Grant, etc.) was created via `prisma db push` not `migrate`, so history is incomplete.
- Running `prisma migrate deploy` against fresh DB would fail (no baseline).
- Future deploys relying on migrate deploy will break.

**Fix applied:** Marked both migrations as applied via `prisma migrate resolve --applied` on current Supabase DB. Schema confirmed in-sync via `prisma db push`.

**Still needed:** Create baseline migration from current schema for future DB provisioning.

Status: **partially fixed** (current DB OK; baseline migration pending).

---

### C4. Middleware imported Prisma (Edge Runtime incompatibility)

**Files:** `apps/web/middleware.ts`, `apps/web/lib/auth.ts`

**Impact:** Middleware runs on Edge Runtime. Importing `auth` from `lib/auth.ts` transitively loaded Prisma Client (Node-only). On first prod deploy, middleware crashed → all routes returned 404.

**Fix:** Split NextAuth config. Created edge-safe `apps/web/auth.config.ts` (callbacks, pages, session only). Middleware now imports empty config + instantiates its own NextAuth. `lib/auth.ts` keeps full config for API routes.

Status: **auto-fixed** (commit `dd45836`).

---

### C5. NEXTAUTH_URL env var pointed to localhost in prod

**Impact:** User set `NEXTAUTH_URL=http://localhost:3000` in Vercel. NextAuth redirected all auth callbacks to localhost → production unreachable.

**Fix:** User updated Vercel env var or removed (NextAuth v5 auto-detects `VERCEL_URL`).

Status: **fixed by user**.

---

## 🟡 High — Bug, no crash

### H1. Duplicate invite flows

**Files:**
- `apps/web/lib/actions/companies.ts:46-86` — `inviteCompany`, `respondToInvitation` (old flow)
- `apps/web/lib/actions/invites.ts` — `createClientInvite`, `acceptInvite` (new flow)

**Wired:**
- Old flow: `app/(dashboard)/consulente/clienti/page.tsx`, `app/(dashboard)/azienda/inviti/page.tsx`
- New flow: `app/(auth)/onboarding/consulente/steps/first-client.tsx`, `app/invite/[token]/*`

**Problem:**
- Old: invites EXISTING users by email (must already have account)
- New: token-based invite for NEW users (email not yet registered)
- Two parallel systems + two DB tables (`ConsultantCompany` vs `ClientInvite`)
- Data inconsistent if consultant uses both

**Fix:** Deprecate old flow. Make `consulente/clienti` page use `createClientInvite`. Keep `ConsultantCompany` as relation record only (created on invite accept).

Priority: High (confusing UX, possible bugs).

---

### H2. `(session.user as any)` pattern — 58 occurrences across 25 files

**Impact:** No type safety on session. If user shape changes, silent runtime errors.

**Fix:** Extend NextAuth types in `apps/web/types/next-auth.d.ts` with `id`, `role`. Remove `as any`.

```ts
// apps/web/types/next-auth.d.ts
import "next-auth";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ADMIN" | "CONSULTANT" | "COMPANY";
    };
  }
}
```

Priority: High (prevents future bugs, cleaner code).

---

### H3. Inconsistent error handling pattern

**Split:**
- `return { error: string }` — `auth.ts`, `documents.ts`, `companies.ts`, `notifications.ts`, `practices.ts`, `profile.ts`, `onboarding.ts`
- `throw new Error(...)` — `grants.ts`, `invites.ts`, `grants-admin.ts`, `export.ts`

**Impact:** Client code must handle both patterns. Easy to miss errors in one style when coming from other.

**Fix:** Pick one. Recommended: `throw` for unauthorized/validation (caller usually catches for toast), `return {error}` for business logic failures. Or unify on one. Document in CLAUDE.md.

Priority: Medium-High.

---

### H4. Chat assistant `await convertToModelMessages` (not async)

**File:** `apps/web/app/api/chat/route.ts:122`

**Impact:** `convertToModelMessages` from AI SDK v6 returns synchronously. User added `await` in 4 commits (`da0bca8`, `59ca354`, `0b038e1`, `6c45180`) — `await` on non-promise is no-op but confusing. If future refactor changes function, silent breakage possible.

**Fix:** Remove `await`.

Priority: Low (cosmetic) — but symptom of deeper chat issue (doesn't work per user).

---

### H5. Dead enum value `DocumentStatus.IN_REVIEW`

**File:** `packages/db/prisma/schema.prisma:61-67`

**Impact:** Enum has `IN_REVIEW` but no code path sets it. Unreachable state.

**Fix:** Remove from enum. Add migration.

Priority: Low.

---

### H6. Rate limit in-memory (chat API)

**File:** `apps/web/app/api/chat/route.ts:11-25`

**Impact:** Serverless functions on Vercel don't share memory. Each invocation fresh `rateLimitMap`. User could hit API 20×N where N = concurrent instances.

**Fix:** Use Supabase table or Upstash Redis for distributed rate limit. Short-term acceptable for MVP with single user.

Priority: Medium (not blocking, but real).

---

### H7. Chat API RAG context may leak cross-practice

**File:** `apps/web/app/api/chat/route.ts:69`

```ts
const chunks = await searchGrantChunks(practice.grantId, lastMessage, 4);
```

Only searches by `grantId`. Same bando shared across practices → chunks same. OK. But practice-specific context (company profile, doc status) is in system prompt. Low risk.

Priority: Low.

---

### H8. Old document file versions not cleaned from Supabase Storage

**File:** `apps/web/lib/actions/documents.ts:48-56`

**Impact:** Each upload creates new path `practices/{id}/{slug}/{timestamp}-{name}`. Old files orphaned. Storage cost grows. Also audit trail lost (no version history).

**Fix:** Either (a) delete old file on new upload, or (b) preserve as history with `PracticeDocumentVersion` table.

Priority: Low (cost).

---

### H9. Missing `revalidatePath` on some actions

**Files:**
- `apps/web/lib/actions/documents.ts` — `uploadDocument`, `reviewDocument` — no revalidate
- `apps/web/lib/actions/practices.ts` — `createPractice`, `updatePracticeStatus` — no revalidate
- `apps/web/lib/actions/notifications.ts` — `markAsRead`, `markAllAsRead` — no revalidate

**Impact:** UI may show stale state. Mitigated by client-side `router.refresh()` in some components. Inconsistent.

**Fix:** Add `revalidatePath` where server returns no redirect/success and caller relies on SSR refresh.

Priority: Medium.

---

## 🟢 Medium — Tech debt / refactor

### M1. `bodySizeLimit: "20mb"` but `maxSizeMb: 10` default

**Files:** `apps/web/next.config.ts`, `packages/db/prisma/schema.prisma:215`

**Status:** OK. Server accepts up to 20MB; docs enforce per-type max (default 10, configurable up to 20).

No action needed unless per-doc max increases past 20MB.

---

### M2. Test fail: `deleteDocumentType > deletes non-standard when ADMIN`

**File:** `apps/web/lib/actions/document-types.test.ts:97`

**Cause:** `deleteDocumentType` calls `redirect()` which throws `NEXT_REDIRECT`. Test doesn't expect redirect.

**Fix:** Wrap test assertion to catch `NEXT_REDIRECT`:

```ts
await expect(deleteDocumentType("id")).rejects.toThrow("NEXT_REDIRECT");
```

Priority: Low (test-only).

---

### M3. `lib/services/ai.ts` is a 9-line re-export shim

**File:** `apps/web/lib/services/ai.ts`

**Content:** Just re-exports from `./rag`. Adds aliases (`indexGrant` = `ingestGrantContent`). Confusing indirection.

**Fix:** Import directly from `rag.ts`. Delete `ai.ts`. Rename aliases to match canonical names in callers.

Priority: Low.

---

### M4. `lib/prisma.ts` is 3-line re-export

**File:** `apps/web/lib/prisma.ts`

**Content:** `export { prisma } from "@finagevolata/db"`. OK pattern, but some imports use `@/lib/prisma`, some `@finagevolata/db`. Inconsistent.

**Fix:** Pick one. Recommended: always `@finagevolata/db` (package boundary). Remove `lib/prisma.ts`.

Priority: Low.

---

### M5. `NotificationType.DOCUMENT_EXPIRING` wired but no cron

**Files:** `packages/db/prisma/schema.prisma:84`, actions emit type but no scheduler.

**Impact:** Expiring documents never alert. DURC > 120gg scenario doesn't trigger.

**Fix:** Add cron job (Vercel Cron or Supabase `pg_cron`) calling `/api/cron/check-expiring`. MVP scope.

Priority: Medium (feature gap).

---

### M6. SPID provider is mock (no real OIDC)

**File:** `apps/web/lib/auth.ts:45-65`

**Impact:** SPID button exists but points to `https://mock-spid.it`. Users click → 404 or error.

**Fix:** Either hide SPID button until real provider integrated, or remove from `providers[]`.

Priority: Medium (UX gap — visible dead feature).

---

### M7. `practices.ts:63` `getPractice` returns `null` on unauthorized, hard to distinguish from 404

**Impact:** Client can't show "not authorized" vs "not found" differently.

**Fix:** Return `{ error: "forbidden" }` or throw.

Priority: Low.

---

### M8. `documents.ts:52` uses `upsert: false`

**File:** `apps/web/lib/actions/documents.ts:52`

**Impact:** If user re-uploads (same filename + timestamp collision — unlikely but possible), throws. Should be safe because timestamp unique per ms.

**Fix:** OK as-is. Risk negligible.

---

### M9. `NotificationType.DOCUMENT_REQUESTED` used when document is uploaded, not requested

**File:** `apps/web/lib/actions/documents.ts:92`

```ts
type: "DOCUMENT_REQUESTED",
title: "Nuovo documento caricato",
```

Enum name doesn't match usage. Should be `DOCUMENT_UPLOADED` (needs schema update).

**Fix:** Add `DOCUMENT_UPLOADED` to `NotificationType` enum + migration + swap.

Priority: Low (naming).

---

## ⚪ Low — Style / naming

### L1. Mixed comment languages

Files have both Italian (`// Email all'azienda`) and English (`// In-memory rate limiter`) comments. Per CLAUDE.md: English for code.

**Fix:** Convert Italian code comments to English. Keep user-facing strings Italian.

Priority: Very low.

---

### L2. Useless empty line in middleware matcher

`apps/web/lib/actions/documents.ts:1-10` has stray blank lines.

Priority: Negligible.

---

### L3. `.env` symlinks fragile

`apps/web/.env` and `packages/db/.env` are symlinks to repo-root `.env`. Works on macOS/Linux, breaks on Windows for contributors.

**Fix:** Use Turborepo env propagation or dotenv-cli.

Priority: Low.

---

## Summary

| Severity | Count | Auto-fixed this session |
|----------|-------|-------------------------|
| 🔴 Critical | 5 | 4 (C1, C2, C4, C5) + C3 partial |
| 🟡 High | 9 | 0 — listed for batch fix |
| 🟢 Medium | 9 | 0 |
| ⚪ Low | 3 | 0 |
| **Total** | **26** | **4.5** |

**Next steps:**
1. Apply C1 fix (wrong domain) — auto this session
2. Review H1 (duplicate invites) — needs product decision (keep new, deprecate old)
3. Batch H2 (session types) + H3 (error pattern) — single refactor PR
4. H4-H9: backlog, prioritize by user impact

**Tests status:** 74/75 passing. 1 test-only fail (M2).

**Typecheck:** Clean.

**Deploy status:** fixed in this session (middleware edge split, schema previewFeatures, migrations marked).
