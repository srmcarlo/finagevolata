# Module C1 — Bandi DB + Admin CRUD — Design Spec

## Overview

First sub-project of **Module C (MVP core)**. Delivers the grant database foundation: admin-driven CRUD of grants (`Grant`) and document types (`DocumentType`), consultant-contributed grant submissions with an admin approval queue, and read-only public lists for company/consultant portals. Depends on Module A (marketing) and Module B (auth/onboarding) already shipped.

## Problem Statement

- Schema (`Grant`, `GrantDocumentRequirement`, `DocumentType`) already defined but no write/read UI exists; `/admin`, `/azienda/bandi`, `/consulente/bandi` are stubs.
- No user with `role = ADMIN` exists — admin bootstrap is needed.
- DocumentType table empty — standard docs (Visura, DURC, DSAN, …) must be seeded.
- MVP spec requires grant entries from both admin and consultant with approval workflow.

## Scope

**In scope:**
1. Admin bootstrap via `ADMIN_EMAILS` env var (auto-promote on login).
2. Seed 15 standard `DocumentType` entries (idempotent, Prisma seed).
3. Admin CRUD of `DocumentType` (create, edit, disable).
4. Admin CRUD of `Grant` with full field coverage + linked `GrantDocumentRequirement`.
5. Consultant-contributed grant submission (same form, `approvedByAdmin: false`).
6. Admin approval queue with approve/reject (reject deletes + emails consultant).
7. Publish workflow (`DRAFT → PUBLISHED → CLOSED`).
8. Public read-only grant list + detail (company + consultant portals).
9. Filters on admin list (status, approval, type, title search).
10. Non-blocking emails on consultant submission (to admins) and reject (to consultant).

**Out of scope (deferred to later Module C sub-projects):**
- Grant ↔ company matching (C4).
- Practice creation from grant (C2).
- Grant scraping / RSS feed ingestion (Phase 2).
- Advanced search (vector / semantic — schema has `embedding` but out of scope).
- Grant versioning / audit log.
- Bulk import from CSV.
- Grant analytics / applications count (beyond `_count.practices`).

## Architecture

### Stack

Same as Modules A/B: Next.js 15 App Router, Prisma 6 + Supabase PostgreSQL, NextAuth v5, Server Actions, Zod via `@finagevolata/shared`, Resend for transactional email (lazy, non-blocking), Vitest 3 for tests.

### File Layout

```
apps/web/
├── app/(dashboard)/
│   ├── admin/
│   │   ├── page.tsx                 # Overview + quick nav
│   │   ├── bandi/
│   │   │   ├── page.tsx             # List with filters
│   │   │   ├── new/page.tsx         # Create form
│   │   │   ├── [id]/page.tsx        # Detail + edit + publish/close/delete
│   │   │   └── queue/page.tsx       # Approval queue (pending consultant submissions)
│   │   └── documenti/
│   │       ├── page.tsx             # List + add DocumentType
│   │       └── [id]/page.tsx        # Edit DocumentType
│   ├── consulente/bandi/
│   │   ├── page.tsx                 # OVERWRITE: public list + "Proponi bando" CTA
│   │   ├── new/page.tsx             # Consultant submission form
│   │   └── [id]/page.tsx            # Detail (edit if own + unapproved)
│   └── azienda/bandi/
│       ├── page.tsx                 # OVERWRITE: public list
│       └── [id]/page.tsx            # Detail (read-only)
├── components/
│   ├── bandi/
│   │   ├── grant-form.tsx           # Shared form (mode: "admin" | "consultant-submit")
│   │   ├── grant-list-card.tsx      # Card used in public lists
│   │   ├── grant-filters.tsx        # Admin list filters (client, URL-synced)
│   │   ├── doc-requirement-picker.tsx  # Multi-select DocumentType inside grant form
│   │   └── reject-dialog.tsx        # Approval queue reject dialog
│   └── documenti/
│       └── doc-type-form.tsx        # DocumentType create/edit form
├── lib/
│   ├── actions/
│   │   ├── grants.ts                # createGrant, updateGrant, deleteGrant, approveGrant, rejectGrant, publishGrant, closeGrant
│   │   ├── grants.test.ts           # 10 tests
│   │   ├── document-types.ts        # CRUD DocumentType (ADMIN only)
│   │   └── document-types.test.ts   # 4 tests
│   ├── auth.ts                      # MODIFY: signIn callback reads ADMIN_EMAILS, upserts role
│   └── email.ts                     # APPEND: sendGrantRejectedEmail, sendGrantSubmittedEmail

packages/
├── shared/src/schemas/
│   ├── grant.ts                     # createGrantSchema, updateGrantSchema + enums
│   └── index.ts                     # APPEND: export "./grant"
└── db/prisma/
    └── seed.ts                      # NEW: seed 15 standard DocumentType
```

### File Boundaries

- **`grant-form.tsx`** is the single authoring surface for both admin and consultant. Props: `{ grant?, mode, documentTypes, onSubmit }`. `mode="consultant-submit"` hides `status` + `approvedByAdmin` fields and forces those values server-side.
- **`lib/actions/grants.ts`** is the only place that writes `Grant`. All entry points (admin UI, consultant UI) route through it. Role-gate via helper `requireRole(roles)`; consultant writes always produce `approvedByAdmin: false`; admin writes produce `approvedByAdmin: true`.
- **`packages/shared/src/schemas/grant.ts`** is framework-agnostic. Zod cross-field refines: `hasClickDay` requires `clickDayDate`; `minAmount ≤ maxAmount`.
- **`auth.ts`** is the single source of the admin bootstrap logic. Policy: on `signIn` callback, if `email ∈ ADMIN_EMAILS` and `user.role !== "ADMIN"`, update to `ADMIN`. Guarded to a single DB write per login (only when mismatch).
- **Middleware** (`middleware.ts`) already protects `/admin/*` — role check unchanged. `/consulente/bandi/new` protected by existing CONSULTANT gate.

## Data Model

No schema migration required. The following existing models/enums cover the scope:

| Model | Purpose | Notes |
|-------|---------|-------|
| `Grant` | Bando entity with status + approval flags | `approvedByAdmin: Boolean @default(false)`, `status: GrantStatus @default(DRAFT)`, `createdById` |
| `GrantDocumentRequirement` | Join table bando → doc type | `isRequired`, `notes`, `order` |
| `DocumentType` | Doc catalog (Visura, DURC, …) | `slug @unique`, `isStandard`, `validityDays?`, `category` |
| `User` | Roles ADMIN/CONSULTANT/COMPANY | Existing `role: UserRole` |

Enums used as-is: `GrantStatus` (DRAFT/PUBLISHED/CLOSED/EXPIRED), `GrantType` (FONDO_PERDUTO/FINANZIAMENTO_AGEVOLATO/CREDITO_IMPOSTA/GARANZIA), `CompanySize`, `DocumentCategory`.

## Admin Bootstrap

**Mechanism:** env-based auto-promote on login.

```typescript
// apps/web/lib/auth.ts — inside signIn callback after user lookup
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

if (user && ADMIN_EMAILS.includes(user.email.toLowerCase()) && user.role !== "ADMIN") {
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
  // Return updated user for session payload
}
```

**Properties:**
- Declarative single source of truth (env var).
- Idempotent: DB write only when role mismatches.
- Revocation requires manual DB update (out of MVP scope for auto-demote).
- Env values set via Vercel dashboard + local `.env`.

## DocumentType Seed

Seed script `packages/db/prisma/seed.ts` inserts the 15 standard documents from `CLAUDE.md` using `prisma.documentType.upsert({ where: { slug }, update: {}, create: {...} })`. `isStandard: true` on all seeded entries. Executed via `pnpm --filter @finagevolata/db prisma db seed`. `package.json` `"prisma": { "seed": "tsx prisma/seed.ts" }` entry.

All 15 entries: visura-camerale, durc, dsan, bilanci, business-plan, de-minimis, preventivi, antimafia, antiriciclaggio, contabilita-separata, doc-identita, firma-digitale, codice-ateco, dichiarazioni-fiscali, certificazioni. `validityDays`: 180 (visura), 120 (durc), null (rest). Default `acceptedFormats: ["pdf"]`, `maxSizeMb: 10`.

Script already present in `packages/db/package.json`: `"prisma:seed": "tsx prisma/seed.ts"`. Run via `pnpm --filter @finagevolata/db prisma:seed`.

## Grant Form

**Component:** `components/bandi/grant-form.tsx` (client).

**Props:**
```typescript
interface GrantFormProps {
  grant?: Grant & { documentRequirements: GrantDocumentRequirement[] };
  mode: "admin" | "consultant-submit";
  documentTypes: DocumentType[];
  onSubmit: (data: CreateGrantInput) => Promise<void>;
}
```

**Sections (collapsable cards):**

1. **Info base** — `title` (5–200), `description` (20–5000, textarea), `issuingBody`, `grantType` (select), `sourceUrl` (optional url).
2. **Importi + scadenze** — `minAmount`, `maxAmount` (number, optional), `deadline`, `openDate` (date, optional), `hasClickDay` (toggle), `clickDayDate` (conditional on toggle).
3. **Eligibilità** — `eligibleAtecoCodes` (text input with comma-separated, normalized to array), `eligibleRegions` (multi-select from static Italian regions list), `eligibleCompanySizes` (4 checkboxes MICRO/SMALL/MEDIUM/LARGE).
4. **Documenti richiesti** — `doc-requirement-picker.tsx` shows all `DocumentType` as multi-select; selected items render as ordered list with per-item `isRequired` toggle + `notes` input + drag-reorder for `order`.
5. **Publish** (admin only) — `status` select, hidden "Save draft" vs "Publish" buttons. `consultant-submit` mode shows only "Invia in approvazione".

**Validation:** single Zod `createGrantSchema` on both client and server. Cross-field refinements.

## Workflow

| Action | Actor | Input | Outcome | DB State |
|--------|-------|-------|---------|----------|
| Create | ADMIN | Full form | Grant created | `status: DRAFT`, `approvedByAdmin: true` |
| Create (submit) | CONSULTANT | Form (no admin fields) | Grant created + email to admins | `status: DRAFT`, `approvedByAdmin: false`, `createdById = consultant.id` |
| Edit own | CONSULTANT | Form on own draft | Grant updated | Unchanged `status/approvedByAdmin`; rejected if already approved |
| Edit any | ADMIN | Form on any grant | Grant updated | Unchanged unless fields changed |
| Approve | ADMIN | Queue → button | `approvedByAdmin: true` | Unchanged otherwise |
| Reject | ADMIN | Queue → dialog with reason | Grant deleted + email to consultant | Row deleted |
| Publish | ADMIN | Detail → button | `status: PUBLISHED, approvedByAdmin: true` | Visible to public |
| Close | ADMIN | Detail → button | `status: CLOSED` | Still visible, marked closed |
| Delete | ADMIN | Detail → confirm | Grant deleted | Row deleted (blocked if linked practices exist — deferred to C2) |

## Server Actions

**`lib/actions/grants.ts`:** `createGrant`, `updateGrant`, `deleteGrant`, `approveGrant`, `rejectGrant`, `publishGrant`, `closeGrant`. All role-gated via `requireRole(role)` helper that throws on non-matching session. `createGrant` + `updateGrant` validate through `createGrantSchema` / `updateGrantSchema`; `updateGrant` uses `prisma.$transaction` to replace `GrantDocumentRequirement` rows atomically. Each mutation calls `revalidatePath(...)` for affected routes. `rejectGrant` + `createGrant` (consultant) fire emails via `.catch()` non-blocking.

**`lib/actions/document-types.ts`:** `createDocumentType`, `updateDocumentType`, `deleteDocumentType`. ADMIN-only. Delete blocks if `isStandard: true` (seeded docs protected).

## Public Lists

**Query (both `/azienda/bandi` and `/consulente/bandi`):**

```typescript
await prisma.grant.findMany({
  where: { status: "PUBLISHED", approvedByAdmin: true },
  orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  include: {
    documentRequirements: { include: { documentType: true } },
    _count: { select: { practices: true } },
  },
});
```

**Card (`grant-list-card.tsx`):** title, issuingBody, grant type badge, amount range, deadline chip with urgency color (red <7d, amber <30d, grey otherwise), "Click Day" badge, detail link. Consultant list adds top-right CTA "Proponi bando".

**Detail (`[id]/page.tsx`):** server-rendered, read-only for azienda; consultant sees "Modifica" button only if `grant.createdById === session.user.id && !grant.approvedByAdmin`. Sections: header, amounts/dates, description, eligibility chips, document requirements list grouped by category, external `sourceUrl` link.

## Admin List Filters

`admin/bandi/page.tsx` accepts searchParams: `status`, `approved`, `type`, `q`. Server builds Prisma `where` accordingly. `grant-filters.tsx` client component wraps URL-synced form with native `<form>` method GET + `router.push` on change.

Approval queue (`admin/bandi/queue/page.tsx`) is a pre-filtered view: `where: { approvedByAdmin: false, createdBy: { role: "CONSULTANT" } }`.

## Email

`lib/email.ts` appends two functions:

- `sendGrantSubmittedEmail({ to: ADMIN_EMAILS, consultantName, grantTitle })` — fired non-blocking on consultant grant creation, notifies all ADMIN_EMAILS with link to `/admin/bandi/queue`.
- `sendGrantRejectedEmail({ to: consultantEmail, consultantName, grantTitle, reason })` — fired non-blocking on admin reject, explains reason, invites resubmit.

Both lazy-loaded Resend (`getResend()`), skip gracefully if `RESEND_API_KEY` missing.

## Validation

`packages/shared/src/schemas/grant.ts` exports:

- `grantStatusEnum`, `grantTypeEnum`, `companySizeEnum` — z.enum() mirrors of Prisma enums
- `grantDocRequirementInput` — `{ documentTypeId, isRequired, notes?, order }`
- `createGrantSchema` — all writable fields + `documentRequirements` array
- `updateGrantSchema` — `createGrantSchema.partial()`

Cross-field refinements: `hasClickDay → clickDayDate required`; `minAmount ≤ maxAmount` when both provided.

## Error Handling

- **Auth**: `requireRole` throws `Error("Non autorizzato")` (no session) or `Error("Accesso negato")` (wrong role). Surfaced to client via React 19 error boundary on form action; form shows inline error.
- **Ownership**: `updateGrant` from CONSULTANT on foreign bando → `Error("Non puoi modificare bando altrui")`.
- **Approved-lock**: CONSULTANT edit on own approved bando → `Error("Bando approvato non modificabile")`.
- **Validation**: Zod errors surface first `.issues[0].message` to UI.
- **Middleware**: `/admin/*` already role-gated; unauthenticated hit → redirect `/login`.

## Testing

**Vitest unit tests:**

`apps/web/lib/actions/grants.test.ts` (10 tests):
1. `createGrant` throws when no session
2. `createGrant` throws when role=COMPANY
3. `createGrant` as ADMIN sets `approvedByAdmin: true`
4. `createGrant` as CONSULTANT sets `approvedByAdmin: false` + calls `sendGrantSubmittedEmail`
5. `createGrant` rejects short title via Zod
6. `createGrant` rejects `hasClickDay: true` without `clickDayDate`
7. `updateGrant` CONSULTANT on foreign bando throws
8. `updateGrant` CONSULTANT on own approved bando throws
9. `approveGrant` toggles `approvedByAdmin` to true
10. `rejectGrant` deletes grant + calls `sendGrantRejectedEmail`

`apps/web/lib/actions/document-types.test.ts` (4 tests):
1. ADMIN creates, updates, deletes
2. Non-ADMIN blocked on all three
3. `delete` blocked if `isStandard: true`
4. Slug uniqueness enforced

`packages/shared/src/schemas/grant.test.ts` (3 tests):
1. Valid payload parses
2. `hasClickDay` without `clickDayDate` fails
3. `minAmount > maxAmount` fails

**Manual smoke tests (post-implementation, documented in plan):**

1. Admin bootstrap: set `ADMIN_EMAILS`, login, verify `/admin` accessible + DB role.
2. Seed: `pnpm --filter @finagevolata/db prisma:seed`, verify 15 rows in `/admin/documenti`.
3. Admin create → form → save → list + detail OK.
4. Admin publish → card appears in `/azienda/bandi`.
5. Consultant `/consulente/bandi/new` submit → `/admin/bandi/queue` pending.
6. Admin approve → publish → public list updates.
7. Admin reject with reason → row deleted, email delivered.
8. Consultant edit own unapproved draft → succeeds.
9. Consultant edit own approved bando → blocked with error.
10. Admin list filter `?status=DRAFT` filters correctly.

**Non-functional:**
- `pnpm --filter web build` clean, no type errors.
- Existing test suite unregressed (32 → ~49 passing).
- Admin list query <500ms with 50 grants + requirements join.

## Environment Variables

Additions (beyond Modules A/B):

| Var | Purpose | Example |
|-----|---------|---------|
| `ADMIN_EMAILS` | Comma-separated emails auto-promoted to ADMIN on login | `srmcarlo@gmail.com,admin2@x.com` |

Existing `RESEND_API_KEY`, `EMAIL_FROM`, `NEXTAUTH_URL` reused for new email functions.

## Dependencies

No new npm dependencies. `tsx ^4.19.0` already present in `packages/db` devDependencies.

## Open Questions

None. All decisions locked via brainstorming Q1–Q6.

## Future Work (Not This Sub-Project)

- **C2**: Practice CRUD (creates from grant + company), requires this sub-project's grants to exist.
- **C3**: Document upload workflow tied to `PracticeDocument` — depends on C2.
- **C4**: Grant ↔ company matching — reads `eligibleAtecoCodes/Regions/CompanySizes` populated here.
- **C5**: Admin dashboard metrics (total grants, approvals per week).
- **C6**: MouseX export + deadline email notifications.
- **Phase 2**: Grant scraping / vector search via `embedding` column.
