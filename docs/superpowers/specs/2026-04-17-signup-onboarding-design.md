# Module B — Signup & Onboarding Design Spec

**Date:** 2026-04-17
**Scope:** Post-signup commercial flow from account creation → "aha moment" for both COMPANY and CONSULENTE roles.

---

## 1. Goal

Convert raw signups into activated users. Each role leaves onboarding with a concrete next action:

- **COMPANY:** profile complete → ready to receive bando matches.
- **CONSULENTE:** studio configured + first client invite sent → pipeline started.

No one gets dropped into an empty dashboard.

---

## 2. Architecture

- **Wizard location:** `/onboarding` (COMPANY) and `/onboarding/consulente` (CONSULENTE). Route group `(auth)` keeps them outside the dashboard chrome.
- **Step engine:** server-rendered, current step inferred from DB state. No client state machine, no cookie.
- **Resume:** landing on `/onboarding` always routes to the correct step based on existing profile + `User.onboardingCompletedAt`.
- **CCIAA adapter:** `lib/cciaa/` with `Provider` interface. Default = `MockProvider`. Real provider swappable via env flag.
- **Magic invite:** new `ClientInvite` Prisma model + `/invite/[token]` public route that creates COMPANY user + consultant link.
- **Welcome email:** Resend, non-blocking, sent at end of `registerUser`.

---

## 3. Schema changes

```prisma
model User {
  // ... existing fields
  onboardingCompletedAt DateTime?
}

model ClientInvite {
  id                String       @id @default(cuid())
  consultantId      String
  consultant        User         @relation("ConsultantInvites", fields: [consultantId], references: [id], onDelete: Cascade)
  email             String
  token             String       @unique
  expiresAt         DateTime
  status            InviteStatus @default(PENDING)
  acceptedAt        DateTime?
  acceptedByUserId  String?
  createdAt         DateTime     @default(now())

  @@index([consultantId])
  @@index([token])
  @@index([status, expiresAt])
  @@map("client_invites")
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

Migration delivered via `prisma migrate diff` + `db execute` (Supabase has drift).

---

## 4. COMPANY wizard

### Step 1: Welcome
- Headline: "Benvenuto in FinAgevolata."
- Subcopy: "2 minuti per completare il profilo. Poi ti mostriamo i bandi giusti per te."
- CTA: "Inizia".

### Step 2: P.IVA → CCIAA autofill → profilo
- Input P.IVA (validated: 11 digits, Italian VAT).
- On submit: call CCIAA adapter; mock returns deterministic fake data (companyName, legalForm, atecoCode, atecoDescription, province, region).
- User sees all fields prefilled; can edit any.
- Fields match existing `CompanyProfile` model — nothing extra.
- Submit → save CompanyProfile → advance.

### Step 3: Interessi
- Settori di interesse (multi-select, optional, persisted on CompanyProfile via new `interestTags String[]`).
  - **DECISION:** skip `interestTags` for MVP to avoid schema creep. Instead, single checkbox "Ricevi email quando ci sono bandi compatibili" → persisted as `User.subscribedToGrantAlerts Boolean @default(false)`.
- Submit → set `User.onboardingCompletedAt = now()` → redirect `/azienda`.

### Resume rules (COMPANY)
- No `CompanyProfile` → Step 1.
- `CompanyProfile` exists, `onboardingCompletedAt` null → Step 3.
- `onboardingCompletedAt` set → redirect `/azienda`.

---

## 5. CONSULENTE wizard

### Step 1: Welcome
- Headline: "Benvenuto, consulente."
- Subcopy: "Configura lo studio e invita il primo cliente. Ti facciamo risparmiare 10 ore di email."

### Step 2: Studio
- `firmName` (string, required).
- `specializations` (multi-select: Manifattura, Servizi, Agricoltura, Turismo, Tech, Altro).
- `maxClients` (number, default 20 — hint from plan).
- Submit → save `ConsultantProfile` → advance.

### Step 3: Primo cliente
- Email input → "Invia invito" button → `createClientInvite` action.
- Secondary button: "Salta per ora" → set `User.onboardingCompletedAt = now()` → redirect `/consulente`.
- On invite sent: show success card + same "Vai alla dashboard" button.

### Resume rules (CONSULENTE)
- No `ConsultantProfile` → Step 1.
- `ConsultantProfile` exists, `onboardingCompletedAt` null → Step 3.
- `onboardingCompletedAt` set → redirect `/consulente`.

---

## 6. Magic invite flow

### Creation
`createClientInvite({ email })` Server Action (consultant-only, auth-gated):
1. Validate email.
2. `token = crypto.randomBytes(32).toString("hex")`.
3. `expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)`.
4. `prisma.clientInvite.create({ ... })`.
5. `sendEmail` via Resend: subject `Ti hanno invitato su FinAgevolata`, body with consultant name + link `${baseUrl}/invite/${token}`.
6. Return `{ ok: true }`.

Rate limit: max 10 invites per consultant per hour. Check `prisma.clientInvite.count({ where: { consultantId, createdAt: gte(now - 1h) } })`.

### Acceptance
`/invite/[token]/page.tsx` (Server Component):
1. Fetch invite by token.
2. If missing, status !== PENDING, or expired → render "Invito non valido o scaduto" + link to `/register`.
3. If valid → render signup form with email locked + consultant name visible.
4. On submit → Server Action `acceptInvite({ token, name, password })`:
   - Re-validate invite (prevent TOCTOU).
   - Create User (role=COMPANY, plan=FREE).
   - Create `ConsultantCompany` row (consultant ↔ new company).
   - Mark invite ACCEPTED with `acceptedByUserId`.
   - Redirect `/login`.

### Middleware
Allowlist `/invite/*` (public).

---

## 7. Welcome email

Triggered at end of `registerUser`, non-blocking (caught, logged, doesn't fail signup):

- **COMPANY:** subject "Benvenuto in FinAgevolata", CTA button "Completa il profilo" → `/onboarding`.
- **CONSULENTE:** subject "Benvenuto, consulente", CTA button "Configura lo studio" → `/onboarding/consulente`.

Plain text bodies (no HTML template engine — keep `text` field on Resend).

---

## 8. CCIAA adapter

```ts
// apps/web/lib/cciaa/types.ts
export interface CciaaData {
  companyName: string;
  legalForm: string;
  atecoCode: string;
  atecoDescription: string;
  province: string;
  region: string;
}
export interface CciaaProvider {
  lookup(vatNumber: string): Promise<CciaaData | null>;
}
```

`MockProvider` returns deterministic sample data regardless of input (but different shapes per last digit of P.IVA to exercise UI).

`index.ts` exports `getCciaaProvider()` which returns the provider based on `process.env.CCIAA_PROVIDER` (default `mock`).

---

## 9. Files to create / modify

### New files
- `packages/db/prisma/migrations/<ts>_client_invites_and_onboarding/migration.sql`
- `apps/web/lib/cciaa/types.ts`
- `apps/web/lib/cciaa/mock.ts`
- `apps/web/lib/cciaa/index.ts`
- `apps/web/lib/actions/onboarding.ts` (split from `companies.ts`: `saveCompanyProfile`, `saveInterests`, `saveConsultantProfile`, `skipClientInvite`)
- `apps/web/lib/actions/invites.ts` (`createClientInvite`, `acceptInvite`)
- `apps/web/components/onboarding/step-indicator.tsx`
- `apps/web/components/onboarding/wizard-shell.tsx`
- `apps/web/app/(auth)/onboarding/steps/welcome-company.tsx`
- `apps/web/app/(auth)/onboarding/steps/vat-profile.tsx`
- `apps/web/app/(auth)/onboarding/steps/interests.tsx`
- `apps/web/app/(auth)/onboarding/consulente/page.tsx`
- `apps/web/app/(auth)/onboarding/consulente/steps/welcome-consultant.tsx`
- `apps/web/app/(auth)/onboarding/consulente/steps/studio.tsx`
- `apps/web/app/(auth)/onboarding/consulente/steps/first-client.tsx`
- `apps/web/app/invite/[token]/page.tsx`
- `packages/shared/src/schemas/invite.ts`

### Modified files
- `packages/db/prisma/schema.prisma` (User.onboardingCompletedAt, User.subscribedToGrantAlerts, ClientInvite model, InviteStatus enum)
- `apps/web/app/(auth)/onboarding/page.tsx` (server component orchestrator — reads role + state, renders correct step)
- `apps/web/lib/actions/auth.ts` (add welcome email trigger after user.create)
- `apps/web/lib/email.ts` (add `sendWelcomeEmail`, `sendClientInviteEmail` helpers)
- `apps/web/middleware.ts` (add `/invite` to public paths handling)
- `turbo.json` (add `CCIAA_PROVIDER` env if needed)

---

## 10. Testing

### Unit tests (Vitest)
- `createClientInvite` — rejects invalid email, enforces 10/hr rate limit, generates 64-char hex token.
- `acceptInvite` — rejects missing/expired/accepted token, creates user + link + marks invite.
- CCIAA `MockProvider` — returns deterministic data for known input.

### Manual E2E
1. Signup as COMPANY → welcome email received → click link → `/onboarding` step 1 → finish 3 steps → land on `/azienda`.
2. Signup as CONSULENTE → `/onboarding/consulente` → 3 steps → send invite → email received at target inbox.
3. Open invite link in incognito → signup form prefilled → submit → land on `/login` → login → `/azienda` visible, ConsultantCompany row exists.
4. Expired invite (manually `UPDATE ... SET expiresAt = now() - 1 day`) → friendly error.
5. Resume: reload `/onboarding` mid-flow → lands on correct step.

---

## 11. Out of scope (Module C or later)

- Real CCIAA API integration (Infocamere, openapi.com).
- Email verification before dashboard access.
- Onboarding progress analytics (abandonment funnel).
- Reinvite / revoke UI for consultants.
- Multi-language invite email.

---

## 12. Self-review

**Placeholder scan:** none.

**Internal consistency:**
- `onboardingCompletedAt` is the single source of truth for "done"; no ambiguity with resume logic.
- `ClientInvite.acceptedByUserId` ties back to User — nullable until accepted.
- Public path for invites added to middleware matches new route.

**Scope check:** single module, ships end-to-end. Estimated 12-14 tasks.

**Ambiguity check:**
- "Settori di interesse" collapsed to a single checkbox — removed schema creep.
- Consultant invite rate limit: 10/hour (per consultant). Fixed here so plan doesn't have to decide.
- Welcome email failure doesn't block signup (explicit).
