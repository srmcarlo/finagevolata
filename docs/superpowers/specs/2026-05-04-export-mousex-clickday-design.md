# Export MouseX Click Day — Design

**Date:** 2026-05-04
**Status:** Approved
**Module:** MVP Click Day integration with partner MouseX

## 1. Goal

Enable a consultant to request a Click Day operation from the partner MouseX directly from the practice workspace. The system sends a structured email to MouseX containing the practice anagraphics and presigned download links to all approved documents. The practice tracks the Click Day status independently of the regular practice status.

## 2. Why

- Memory `project_finanza_agevolata`: MVP scope includes "Bottone Richiedi Click Day → export pacchetto dati via email a MouseX". Phase 2 introduces a bidirectional API.
- MouseX currently operates via email/phone (memory `reference_mousex`). An email-based handoff matches their existing workflow with zero integration cost on their side.
- Click Day is a key differentiator vs competitors (Bandit, Muffin, Jump). Without this, the practice workspace is feature-incomplete for INAIL ISI / Sabatini / Transizione 4.0 grants.

## 3. Scope

### In scope
- Consultant-side button "Richiedi Click Day" on practice detail page
- Email delivery to MouseX with practice data + presigned document links
- Optional consultant note (free text, ≤500 chars)
- `Practice.clickDayStatus` lifecycle: `NONE → REQUESTED` (further states are Phase 2)
- Re-send flow (explicit user confirmation)
- Read-only Click Day banner on company-side practice page
- `PracticeActivity` audit log for every export

### Out of scope (Phase 2)
- Webhook / API bidirectional with MouseX (MouseX updates status from their side)
- Multi-partner Click Day routing (per-grant partner email)
- Push notifications to the company when Click Day is requested
- Direct file attachments (link-based delivery only — Resend has a 5MB attachment limit anyway)
- Auto-resend with scheduling
- Tracking ranking / outcome (`RANKED / WON / LOST`)

## 4. User flow

### Consultant — first request
1. Consultant opens `/consulente/pratiche/{id}` of a practice whose grant has `hasClickDay=true`
2. Below the document checklist, a "Click Day" section is visible
3. Section shows status badge `Non richiesto` and a form
4. Form is disabled until **all** documents are `APPROVED`. Tooltip explains the blocker.
5. Consultant fills optional notes textarea
6. Consultant clicks "Richiedi Click Day"
7. Server action validates, generates presigned URLs, sends email, updates status, logs activity
8. Page revalidates: status badge becomes `Inviato a MouseX`, banner shows submission timestamp

### Consultant — re-send
1. Same page, status is non-NONE
2. Banner shows "Richiesta inviata il {date}"
3. Button "Re-invia richiesta" opens a confirmation modal with note textarea
4. On confirm, server action re-sends and logs a new activity entry. Status remains `REQUESTED`.

### Company — read-only visibility
1. Company opens `/azienda/pratiche/{id}` of the same practice
2. If `clickDayStatus != NONE`, an informational banner appears:
   "La tua richiesta Click Day è stata inviata al partner MouseX il {date}."
3. No interactive controls — company cannot trigger or re-send.

## 5. Architecture

### 5.1 Email layer (`apps/web/lib/email.ts`)

Extend the existing `sendEmail` signature to accept an optional `cc` parameter (string or array). Resend's API supports `cc` natively.

Add helper:

```ts
sendClickDayRequestEmail({
  to: string;          // MOUSEX_EMAIL
  cc: string;          // consultant email
  subject: string;
  text: string;
}) → Promise<{success, error?}>
```

This is a thin wrapper for clarity; under the hood it calls the extended `sendEmail`.

### 5.2 Server action (`apps/web/lib/actions/export.ts`)

Replace the existing `exportForClickDay(practiceId)` with:

```ts
exportForClickDay(practiceId: string, notes?: string)
  → { success: true; sentAt: Date } | { error: string }
```

Logic:
1. Auth: must be CONSULTANT
2. Load practice with grant + company.companyProfile + documents.documentType + consultant
3. Ownership: `practice.consultantId === userId`
4. Eligibility: `grant.hasClickDay === true`
5. Documents: every doc must be `APPROVED`
6. Env: `MOUSEX_EMAIL` must be set, otherwise return `{ error: "MOUSEX_EMAIL non configurato" }`
7. Compute `linkExpirySeconds`:
   - if `grant.clickDayDate`: `(clickDayDate + 24h - now) / 1000` clamped to `[3600, 7*86400]`
   - else: `7 * 86400` (7 days)
8. For each document: `supabase.storage.from(BUCKET).createSignedUrl(filePath, linkExpirySeconds)`
9. Build email text from template (see §6)
10. Send via `sendClickDayRequestEmail({ to: MOUSEX_EMAIL, cc: consultant.email, ... })`
11. If email send fails → return `{ error }` and **do not** mutate `clickDayStatus`
12. On success:
    - `prisma.practice.update({ clickDayStatus: "REQUESTED" })`
    - `prisma.practiceActivity.create({ type: "CLICKDAY_EXPORT", detail: "Richiesta Click Day inviata a MouseX${notes ? ` — note: ${notes}` : ""}" })`
13. Return `{ success: true, sentAt: <now> }`

The action is **idempotent at the call level**: calling it twice produces two emails and two activity entries, but `clickDayStatus` remains `REQUESTED`. The UI guards against accidental re-invocation by requiring an explicit modal confirmation.

### 5.3 UI components

#### `components/click-day-status-badge.tsx`
Maps `ClickDayStatus` to a colored pill. Pure presentation. Used both on the practice detail page and (later) on the practices list.

| Status | Color | Label |
|--------|-------|-------|
| NONE | gray | Non richiesto |
| REQUESTED | blue | Inviato a MouseX |
| SENT_TO_PARTNER | indigo | In carico MouseX |
| SUBMITTED | violet | Inviato |
| RANKED | yellow | In graduatoria |
| WON | green | Vinto |
| LOST | red | Perso |

#### `components/click-day-section.tsx`
Client component for the consultant practice page. Props:
```ts
{
  practiceId: string;
  hasClickDay: boolean;
  clickDayStatus: ClickDayStatus;
  lastExportAt: Date | null;     // from latest CLICKDAY_EXPORT PracticeActivity
  documentsAllApproved: boolean;
  pendingDocCount: number;
}
```

States:
- `hasClickDay=false`: render nothing
- `hasClickDay=true && clickDayStatus=NONE`: show form (textarea + submit button). Submit calls server action. Button disabled with tooltip if `!documentsAllApproved`.
- `hasClickDay=true && clickDayStatus!=NONE`: show banner with `lastExportAt` + "Re-invia" button that opens confirmation modal.

The action is invoked via a server action passed as prop or imported directly. After completion, `router.refresh()` revalidates the page.

#### Page wiring

**`app/(dashboard)/consulente/pratiche/[id]/page.tsx`**: import `ClickDaySection`, compute `lastExportAt` from activities, pass props. Place section after the document checklist, before chat/timeline grid.

**`app/(dashboard)/azienda/pratiche/[id]/page.tsx`**: read-only banner if `clickDayStatus != "NONE"` showing `"Richiesta Click Day inviata al partner MouseX il {date}"`.

## 6. Email template

```
Subject: [Click Day] {grant.title} — {company.companyName}

Richiesta Click Day da FinAgevolata.

— BANDO —
Titolo: {grant.title}
Ente: {grant.issuingBody}
Click Day: {grant.clickDayDate.toLocaleString("it-IT") || "Da definire"}

— AZIENDA —
Ragione sociale: {profile.companyName}
P.IVA: {profile.vatNumber}
Forma giuridica: {profile.legalForm}
ATECO: {profile.atecoCode} — {profile.atecoDescription}
Regione: {profile.region}
Provincia: {profile.province}

— DOCUMENTI ({documents.length} approvati) —
1. {documentType.name}: {presignedUrl}
2. {documentType.name}: {presignedUrl}
...

— CONSULENTE —
Nome: {consultant.name}
Email: {consultant.email}

— NOTE —
{notes || "—"}

I link ai documenti scadono il {linkExpiry.toLocaleString("it-IT")}.

— FinAgevolata
```

Plain text, no HTML. Resend renders text-only correctly.

## 7. Data model

No schema changes. All required structures already exist:

- `Practice.clickDayStatus: ClickDayStatus` (default `NONE`)
- `Grant.hasClickDay`, `Grant.clickDayDate`
- `ActivityType.CLICKDAY_EXPORT`
- Supabase Storage with signed URL support

## 8. Configuration

New env var:

| Name | Required | Example | Notes |
|------|----------|---------|-------|
| `MOUSEX_EMAIL` | Yes (production) | `clickday@mousex.it` | Recipient address. To be provided by user. The action returns an error if missing — no silent fallback. |

`RESEND_API_KEY` and `EMAIL_FROM` already exist.

## 9. Testing

### Unit / integration tests (`apps/web/lib/actions/export.test.ts`)
- Returns error when `grant.hasClickDay=false`
- Returns error when any document is not `APPROVED`
- Returns error when `MOUSEX_EMAIL` is missing
- Returns error when `sendEmail` fails (and `clickDayStatus` is NOT updated)
- On success: `clickDayStatus=REQUESTED`, `PracticeActivity` row created with `CLICKDAY_EXPORT`
- Notes longer than 500 chars are rejected with a validation error (Zod-validated server-side)
- Presigned URL TTL respects `clickDayDate + 24h` clamp

### Manual smoke test
1. Set `MOUSEX_EMAIL` in `.env`
2. Login as consultant with a practice on a `hasClickDay` grant, all docs approved
3. Click "Richiedi Click Day" without notes → email arrives, status → REQUESTED
4. Reload page: banner visible with timestamp, "Re-invia" button works
5. Confirm modal: re-sends, second activity entry logged
6. Login as company → banner visible, no interactive controls
7. Negative: with one doc in `IN_REVIEW`, button disabled, tooltip shows count

## 10. Failure modes

| Failure | Behavior |
|---------|----------|
| `MOUSEX_EMAIL` unset | Action returns `{ error: "MOUSEX_EMAIL non configurato" }`. Button does NOT preflight (server secret); error is displayed inline after the user clicks. |
| Resend API down | Action returns error. Status NOT updated. User sees inline error, can retry |
| Supabase signed URL fails for one doc | Action returns error before sending email. Status NOT updated. |
| Practice updated between read and email send | Acceptable race — last write wins. Activity log preserves history. |
| Consultant re-sends 10x | All emails sent, all logged. Status remains `REQUESTED`. Modal confirmation reduces accidental spam. |

## 11. Security

- Presigned URLs are time-bound. After expiry, MouseX cannot access documents.
- `MOUSEX_EMAIL` is treated as a config secret (env var, not committed).
- Only consultants tied to the practice can trigger the export (RBAC enforced in action).
- Audit trail in `PracticeActivity` preserves WHO/WHEN/WHAT for every export.

## 12. Out of scope (deferred)

Already memorized:
- Bidirectional MouseX webhook
- MouseX writing back into `clickDayStatus`
- Multi-partner Click Day
- Push notifications
- Auto-scheduling resends
- `ClickDayStatus` lifecycle beyond `REQUESTED`

These remain in `project_finanza_agevolata` memory for Phase 2.

## 13. Open TODOs at write time

- `MOUSEX_EMAIL` env value: to be supplied by user before production deploy. Memorized in `project_finanza_agevolata`.
