# Export MouseX Click Day — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a working "Richiedi Click Day" flow on the consultant practice page that emails MouseX with practice anagraphics + presigned document links, tracks status in `Practice.clickDayStatus`, and exposes a read-only banner on the company practice page.

**Architecture:** A pure TypeScript service (`lib/services/click-day-export.ts`) builds the email text and computes the presigned URL TTL. A server-action layer (`lib/actions/export.ts`) wraps it with auth, Prisma, Supabase signed-URL generation, and Resend email delivery. New UI components surface status and the trigger form on the consultant practice page; the company practice page gets a read-only informational banner.

**Tech Stack:** Next.js 15 App Router (RSC + Server Actions), Prisma + PostgreSQL, NextAuth.js v5, Supabase Storage signed URLs, Resend, Zod, Tailwind, Vitest.

**Spec reference:** `docs/superpowers/specs/2026-05-04-export-mousex-clickday-design.md`

---

## File Structure

**New files:**
- `apps/web/lib/services/click-day-export.ts` — Pure helpers (TTL computation, email text builder)
- `apps/web/lib/services/click-day-export.test.ts` — Unit tests for pure helpers
- `apps/web/lib/actions/export.test.ts` — Integration tests with mocked Prisma + Supabase + Resend
- `apps/web/components/click-day-status-badge.tsx` — Presentation component
- `apps/web/components/click-day-section.tsx` — Client component with form and re-send modal

**Modified files:**
- `apps/web/lib/email.ts` — Add `cc` support to `sendEmail`, add `sendClickDayRequestEmail` helper
- `apps/web/lib/actions/export.ts` — Replace stub with full email-sending action
- `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx` — Wire `<ClickDaySection />`
- `apps/web/app/(dashboard)/azienda/pratiche/[id]/page.tsx` — Add read-only Click Day banner

**No schema changes.** `Practice.clickDayStatus`, `Grant.hasClickDay`, `Grant.clickDayDate`, and `ActivityType.CLICKDAY_EXPORT` already exist.

**New env var:** `MOUSEX_EMAIL` (required at runtime).

---

## Task 1: Pure helpers — TTL computation

**Files:**
- Create: `apps/web/lib/services/click-day-export.ts`
- Create: `apps/web/lib/services/click-day-export.test.ts`

- [ ] **Step 1: Write the failing test for `computeLinkExpirySeconds`**

Create `apps/web/lib/services/click-day-export.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeLinkExpirySeconds } from "./click-day-export";

const SEVEN_DAYS = 7 * 86400;
const ONE_HOUR = 3600;

describe("computeLinkExpirySeconds", () => {
  const now = new Date("2026-05-05T10:00:00Z");

  it("returns 7 days when clickDayDate is null", () => {
    expect(computeLinkExpirySeconds(null, now)).toBe(SEVEN_DAYS);
  });

  it("returns clickDayDate + 24h delta when within bounds", () => {
    const clickDayDate = new Date("2026-05-08T10:00:00Z"); // +3 days
    const expected = 3 * 86400 + 86400; // 4 days in seconds
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(expected);
  });

  it("clamps to 7 days max", () => {
    const clickDayDate = new Date("2026-06-30T10:00:00Z"); // far future
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(SEVEN_DAYS);
  });

  it("clamps to 1 hour min when clickDayDate is in the past", () => {
    const clickDayDate = new Date("2026-05-04T10:00:00Z"); // -1 day
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(ONE_HOUR);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter web test lib/services/click-day-export.test.ts
```
Expected: FAIL with "Cannot find module './click-day-export'".

- [ ] **Step 3: Implement `computeLinkExpirySeconds`**

Create `apps/web/lib/services/click-day-export.ts`:

```ts
const ONE_HOUR_SECONDS = 3600;
const SEVEN_DAYS_SECONDS = 7 * 86400;

export function computeLinkExpirySeconds(
  clickDayDate: Date | null,
  now: Date = new Date(),
): number {
  if (!clickDayDate) return SEVEN_DAYS_SECONDS;
  const targetMs = clickDayDate.getTime() + 86400 * 1000;
  const deltaSeconds = Math.floor((targetMs - now.getTime()) / 1000);
  if (deltaSeconds > SEVEN_DAYS_SECONDS) return SEVEN_DAYS_SECONDS;
  if (deltaSeconds < ONE_HOUR_SECONDS) return ONE_HOUR_SECONDS;
  return deltaSeconds;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter web test lib/services/click-day-export.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/click-day-export.ts apps/web/lib/services/click-day-export.test.ts
git commit -m "feat(clickday): add computeLinkExpirySeconds helper with TTL clamps"
```

---

## Task 2: Pure helpers — email text builder

**Files:**
- Modify: `apps/web/lib/services/click-day-export.ts`
- Modify: `apps/web/lib/services/click-day-export.test.ts`

- [ ] **Step 1: Append the failing test for `buildClickDayEmailText`**

Add to `apps/web/lib/services/click-day-export.test.ts` (after the existing `describe`):

```ts
import { buildClickDayEmailText } from "./click-day-export";

describe("buildClickDayEmailText", () => {
  const baseInput = {
    grant: {
      title: "INAIL ISI 2026",
      issuingBody: "INAIL",
      clickDayDate: new Date("2026-06-15T09:00:00Z"),
    },
    company: {
      companyName: "Acme Srl",
      vatNumber: "12345678901",
      legalForm: "SRL",
      atecoCode: "62.01",
      atecoDescription: "Produzione di software",
      region: "Lombardia",
      province: "MI",
    },
    documents: [
      { name: "Visura Camerale", url: "https://signed/visura" },
      { name: "DURC", url: "https://signed/durc" },
    ],
    consultant: { name: "Mario Rossi", email: "mario@studio.it" },
    notes: "Priorità alta",
    linkExpiry: new Date("2026-06-16T09:00:00Z"),
  };

  it("includes grant title and issuing body", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("INAIL ISI 2026");
    expect(text).toContain("INAIL");
  });

  it("includes company anagraphics", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("Acme Srl");
    expect(text).toContain("12345678901");
    expect(text).toContain("62.01");
    expect(text).toContain("Produzione di software");
    expect(text).toContain("Lombardia");
  });

  it("lists every document with its presigned URL", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("Visura Camerale: https://signed/visura");
    expect(text).toContain("DURC: https://signed/durc");
  });

  it("includes consultant contact", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("Mario Rossi");
    expect(text).toContain("mario@studio.it");
  });

  it("includes notes when provided", () => {
    expect(buildClickDayEmailText(baseInput)).toContain("Priorità alta");
  });

  it("uses dash placeholder when notes are empty", () => {
    const text = buildClickDayEmailText({ ...baseInput, notes: "" });
    expect(text).toMatch(/NOTE —\n—/);
  });

  it("falls back to 'Da definire' when clickDayDate is null", () => {
    const text = buildClickDayEmailText({
      ...baseInput,
      grant: { ...baseInput.grant, clickDayDate: null },
    });
    expect(text).toContain("Da definire");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter web test lib/services/click-day-export.test.ts
```
Expected: FAIL with "buildClickDayEmailText is not defined" (or similar).

- [ ] **Step 3: Implement `buildClickDayEmailText`**

Append to `apps/web/lib/services/click-day-export.ts`:

```ts
export interface ClickDayEmailInput {
  grant: {
    title: string;
    issuingBody: string;
    clickDayDate: Date | null;
  };
  company: {
    companyName: string;
    vatNumber: string;
    legalForm: string;
    atecoCode: string;
    atecoDescription: string;
    region: string;
    province: string;
  };
  documents: Array<{ name: string; url: string }>;
  consultant: { name: string; email: string };
  notes: string;
  linkExpiry: Date;
}

export function buildClickDayEmailText(input: ClickDayEmailInput): string {
  const { grant, company, documents, consultant, notes, linkExpiry } = input;
  const clickDayLabel = grant.clickDayDate
    ? grant.clickDayDate.toLocaleString("it-IT")
    : "Da definire";
  const docsBlock = documents
    .map((d, i) => `${i + 1}. ${d.name}: ${d.url}`)
    .join("\n");
  const notesBlock = notes.trim() === "" ? "—" : notes.trim();

  return `Richiesta Click Day da FinAgevolata.

— BANDO —
Titolo: ${grant.title}
Ente: ${grant.issuingBody}
Click Day: ${clickDayLabel}

— AZIENDA —
Ragione sociale: ${company.companyName}
P.IVA: ${company.vatNumber}
Forma giuridica: ${company.legalForm}
ATECO: ${company.atecoCode} — ${company.atecoDescription}
Regione: ${company.region}
Provincia: ${company.province}

— DOCUMENTI (${documents.length} approvati) —
${docsBlock}

— CONSULENTE —
Nome: ${consultant.name}
Email: ${consultant.email}

— NOTE —
${notesBlock}

I link ai documenti scadono il ${linkExpiry.toLocaleString("it-IT")}.

— FinAgevolata
`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter web test lib/services/click-day-export.test.ts
```
Expected: 11 tests pass total.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/click-day-export.ts apps/web/lib/services/click-day-export.test.ts
git commit -m "feat(clickday): add buildClickDayEmailText template builder"
```

---

## Task 3: Extend `sendEmail` with `cc` support + helper

**Files:**
- Modify: `apps/web/lib/email.ts`

- [ ] **Step 1: Extend the `sendEmail` signature**

In `apps/web/lib/email.ts`, replace the existing `sendEmail` function with:

```ts
export async function sendEmail({
  to,
  cc,
  subject,
  text,
}: {
  to: string;
  cc?: string | string[];
  subject: string;
  text: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY non configurata. E-mail non inviata:", subject);
    return { success: false, error: "Missing API Key" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to,
      ...(cc ? { cc } : {}),
      subject,
      text,
    });

    if (error) {
      console.error("Errore invio e-mail Resend:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Errore imprevisto e-mail:", error);
    return { success: false, error };
  }
}
```

- [ ] **Step 2: Add the `sendClickDayRequestEmail` helper**

Append to `apps/web/lib/email.ts`:

```ts
export async function sendClickDayRequestEmail({
  to,
  cc,
  grantTitle,
  companyName,
  text,
}: {
  to: string;
  cc: string;
  grantTitle: string;
  companyName: string;
  text: string;
}) {
  const subject = `[Click Day] ${grantTitle} — ${companyName}`;
  return sendEmail({ to, cc, subject, text });
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/email.ts
git commit -m "feat(email): add cc support and sendClickDayRequestEmail helper"
```

---

## Task 4: Rewrite `exportForClickDay` action — failing test first

**Files:**
- Create: `apps/web/lib/actions/export.test.ts`

- [ ] **Step 1: Write the failing integration test suite**

Create `apps/web/lib/actions/export.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockPracticeFindUnique = vi.fn();
const mockPracticeUpdate = vi.fn();
const mockActivityCreate = vi.fn();
const mockSendClickDayRequestEmail = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      findUnique: (...a: any[]) => mockPracticeFindUnique(...a),
      update: (...a: any[]) => mockPracticeUpdate(...a),
    },
    practiceActivity: {
      create: (...a: any[]) => mockActivityCreate(...a),
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendClickDayRequestEmail: (...a: any[]) => mockSendClickDayRequestEmail(...a),
}));
vi.mock("@/lib/supabase", () => ({
  createServerSupabase: () => ({
    storage: {
      from: () => ({
        createSignedUrl: (...a: any[]) => mockCreateSignedUrl(...a),
      }),
    },
  }),
}));

import { exportForClickDay } from "./export";

const validPractice = {
  id: "p1",
  consultantId: "u-consultant",
  clickDayStatus: "NONE",
  grant: {
    title: "INAIL ISI",
    issuingBody: "INAIL",
    hasClickDay: true,
    clickDayDate: new Date("2026-06-15T09:00:00Z"),
  },
  company: {
    name: "Acme",
    companyProfile: {
      companyName: "Acme Srl",
      vatNumber: "12345678901",
      legalForm: "SRL",
      atecoCode: "62.01",
      atecoDescription: "Produzione di software",
      region: "Lombardia",
      province: "MI",
    },
  },
  consultant: { name: "Mario Rossi", email: "mario@studio.it" },
  documents: [
    {
      id: "d1",
      status: "APPROVED",
      filePath: "p1/visura.pdf",
      documentType: { name: "Visura Camerale" },
    },
    {
      id: "d2",
      status: "APPROVED",
      filePath: "p1/durc.pdf",
      documentType: { name: "DURC" },
    },
  ],
};

beforeEach(() => {
  mockAuth.mockReset();
  mockPracticeFindUnique.mockReset();
  mockPracticeUpdate.mockReset();
  mockActivityCreate.mockReset();
  mockSendClickDayRequestEmail.mockReset();
  mockCreateSignedUrl.mockReset();
  process.env.MOUSEX_EMAIL = "clickday@mousex.it";
  mockAuth.mockResolvedValue({ user: { id: "u-consultant", role: "CONSULTANT" } });
  mockPracticeFindUnique.mockResolvedValue(validPractice);
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/url" } });
  mockSendClickDayRequestEmail.mockResolvedValue({ success: true });
});

describe("exportForClickDay", () => {
  it("rejects when user is not CONSULTANT", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u", role: "COMPANY" } });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
  });

  it("rejects when practice not owned by consultant", async () => {
    mockPracticeFindUnique.mockResolvedValue({
      ...validPractice,
      consultantId: "other",
    });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
  });

  it("rejects when grant has no Click Day", async () => {
    mockPracticeFindUnique.mockResolvedValue({
      ...validPractice,
      grant: { ...validPractice.grant, hasClickDay: false },
    });
    const r = await exportForClickDay("p1");
    expect(r).toEqual({ error: "Questo bando non prevede Click Day" });
  });

  it("rejects when not all documents are APPROVED", async () => {
    mockPracticeFindUnique.mockResolvedValue({
      ...validPractice,
      documents: [
        ...validPractice.documents,
        {
          id: "d3",
          status: "IN_REVIEW",
          filePath: "p1/durc.pdf",
          documentType: { name: "DSAN" },
        },
      ],
    });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
  });

  it("rejects when MOUSEX_EMAIL is missing", async () => {
    delete process.env.MOUSEX_EMAIL;
    const r = await exportForClickDay("p1");
    expect(r).toEqual({ error: "MOUSEX_EMAIL non configurato" });
  });

  it("rejects notes longer than 500 chars", async () => {
    const r = await exportForClickDay("p1", "x".repeat(501));
    expect(r).toHaveProperty("error");
  });

  it("does NOT mutate clickDayStatus when email send fails", async () => {
    mockSendClickDayRequestEmail.mockResolvedValue({
      success: false,
      error: "boom",
    });
    const r = await exportForClickDay("p1");
    expect(r).toHaveProperty("error");
    expect(mockPracticeUpdate).not.toHaveBeenCalled();
    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it("on success: updates status, creates activity, returns sentAt", async () => {
    const r = await exportForClickDay("p1", "priorità alta");
    expect(r).toHaveProperty("success", true);
    expect(mockPracticeUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { clickDayStatus: "REQUESTED" },
    });
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          practiceId: "p1",
          actorId: "u-consultant",
          type: "CLICKDAY_EXPORT",
          detail: expect.stringContaining("priorità alta"),
        }),
      }),
    );
  });

  it("sends email with the correct addresses", async () => {
    await exportForClickDay("p1");
    expect(mockSendClickDayRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "clickday@mousex.it",
        cc: "mario@studio.it",
        grantTitle: "INAIL ISI",
        companyName: "Acme Srl",
      }),
    );
  });

  it("requests one signed URL per document", async () => {
    await exportForClickDay("p1");
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter web test lib/actions/export.test.ts
```
Expected: FAIL — current `exportForClickDay` doesn't send email or return the new shape.

---

## Task 5: Rewrite `exportForClickDay` action — implementation

**Files:**
- Modify: `apps/web/lib/actions/export.ts`

- [ ] **Step 1: Replace the action implementation**

Replace the entire contents of `apps/web/lib/actions/export.ts` with:

```ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { sendClickDayRequestEmail } from "@/lib/email";
import {
  buildClickDayEmailText,
  computeLinkExpirySeconds,
} from "@/lib/services/click-day-export";

const MAX_NOTES_LENGTH = 500;
const STORAGE_BUCKET = "documents";

export async function exportForClickDay(practiceId: string, notes: string = "") {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId || role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return { error: `Le note non possono superare ${MAX_NOTES_LENGTH} caratteri` };
  }

  const mousexEmail = process.env.MOUSEX_EMAIL;
  if (!mousexEmail) {
    return { error: "MOUSEX_EMAIL non configurato" };
  }

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      grant: true,
      company: { include: { companyProfile: true } },
      consultant: true,
      documents: { include: { documentType: true } },
    },
  });

  if (!practice || practice.consultantId !== userId) {
    return { error: "Pratica non trovata" };
  }

  if (!practice.grant.hasClickDay) {
    return { error: "Questo bando non prevede Click Day" };
  }

  const allApproved = practice.documents.every((d) => d.status === "APPROVED");
  if (!allApproved) {
    return { error: "Tutti i documenti devono essere approvati prima dell'export" };
  }

  const profile = practice.company.companyProfile;
  if (!profile) {
    return { error: "Profilo azienda incompleto" };
  }

  const now = new Date();
  const expirySeconds = computeLinkExpirySeconds(practice.grant.clickDayDate, now);
  const linkExpiry = new Date(now.getTime() + expirySeconds * 1000);

  const supabase = createServerSupabase();
  const docsWithUrls: Array<{ name: string; url: string }> = [];
  for (const doc of practice.documents) {
    if (!doc.filePath) {
      return { error: `File mancante per documento "${doc.documentType.name}"` };
    }
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.filePath, expirySeconds);
    if (error || !data?.signedUrl) {
      return { error: `Errore generazione link per "${doc.documentType.name}"` };
    }
    docsWithUrls.push({ name: doc.documentType.name, url: data.signedUrl });
  }

  const text = buildClickDayEmailText({
    grant: {
      title: practice.grant.title,
      issuingBody: practice.grant.issuingBody,
      clickDayDate: practice.grant.clickDayDate,
    },
    company: {
      companyName: profile.companyName,
      vatNumber: profile.vatNumber,
      legalForm: profile.legalForm,
      atecoCode: profile.atecoCode,
      atecoDescription: profile.atecoDescription,
      region: profile.region,
      province: profile.province,
    },
    documents: docsWithUrls,
    consultant: {
      name: practice.consultant.name,
      email: practice.consultant.email,
    },
    notes,
    linkExpiry,
  });

  const emailResult = await sendClickDayRequestEmail({
    to: mousexEmail,
    cc: practice.consultant.email,
    grantTitle: practice.grant.title,
    companyName: profile.companyName,
    text,
  });

  if (!emailResult.success) {
    return { error: "Invio email fallito. Riprova più tardi." };
  }

  await prisma.practice.update({
    where: { id: practiceId },
    data: { clickDayStatus: "REQUESTED" },
  });

  const detailSuffix = notes.trim() ? ` — note: ${notes.trim()}` : "";
  await prisma.practiceActivity.create({
    data: {
      practiceId,
      actorId: userId,
      type: "CLICKDAY_EXPORT",
      detail: `Richiesta Click Day inviata a MouseX${detailSuffix}`,
    },
  });

  return { success: true as const, sentAt: now };
}
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
pnpm --filter web test lib/actions/export.test.ts
```
Expected: 10 tests pass.

- [ ] **Step 3: Run the full test suite to confirm no regressions**

```bash
pnpm --filter web test
```
Expected: previously passing tests still pass. The pre-existing `document-types.test.ts` failure is unrelated (out of scope).

- [ ] **Step 4: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/export.ts apps/web/lib/actions/export.test.ts
git commit -m "feat(clickday): rewrite exportForClickDay to send MouseX email"
```

---

## Task 6: `ClickDayStatusBadge` component

**Files:**
- Create: `apps/web/components/click-day-status-badge.tsx`

- [ ] **Step 1: Create the badge**

Create `apps/web/components/click-day-status-badge.tsx`:

```tsx
type ClickDayStatus =
  | "NONE"
  | "REQUESTED"
  | "SENT_TO_PARTNER"
  | "SUBMITTED"
  | "RANKED"
  | "WON"
  | "LOST";

const STYLES: Record<ClickDayStatus, { bg: string; text: string; label: string }> = {
  NONE: { bg: "bg-gray-100", text: "text-gray-700", label: "Non richiesto" },
  REQUESTED: { bg: "bg-blue-100", text: "text-blue-700", label: "Inviato a MouseX" },
  SENT_TO_PARTNER: { bg: "bg-indigo-100", text: "text-indigo-700", label: "In carico MouseX" },
  SUBMITTED: { bg: "bg-violet-100", text: "text-violet-700", label: "Inviato" },
  RANKED: { bg: "bg-yellow-100", text: "text-yellow-800", label: "In graduatoria" },
  WON: { bg: "bg-green-100", text: "text-green-700", label: "Vinto" },
  LOST: { bg: "bg-red-100", text: "text-red-700", label: "Perso" },
};

export function ClickDayStatusBadge({ status }: { status: ClickDayStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/click-day-status-badge.tsx
git commit -m "feat(clickday): add ClickDayStatusBadge component"
```

---

## Task 7: `ClickDaySection` client component

**Files:**
- Create: `apps/web/components/click-day-section.tsx`

- [ ] **Step 1: Create the section**

Create `apps/web/components/click-day-section.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportForClickDay } from "@/lib/actions/export";
import { ClickDayStatusBadge } from "./click-day-status-badge";

type ClickDayStatus =
  | "NONE"
  | "REQUESTED"
  | "SENT_TO_PARTNER"
  | "SUBMITTED"
  | "RANKED"
  | "WON"
  | "LOST";

interface Props {
  practiceId: string;
  hasClickDay: boolean;
  clickDayStatus: ClickDayStatus;
  lastExportAt: Date | null;
  documentsAllApproved: boolean;
  pendingDocCount: number;
}

const MAX_NOTES = 500;

export function ClickDaySection({
  practiceId,
  hasClickDay,
  clickDayStatus,
  lastExportAt,
  documentsAllApproved,
  pendingDocCount,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!hasClickDay) return null;

  function submit(currentNotes: string) {
    setError(null);
    startTransition(async () => {
      const result = await exportForClickDay(practiceId, currentNotes);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNotes("");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  const blocker = !documentsAllApproved
    ? `${pendingDocCount} document${pendingDocCount === 1 ? "o" : "i"} non ancora approvat${pendingDocCount === 1 ? "o" : "i"}`
    : null;

  return (
    <section className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Click Day</h2>
        <ClickDayStatusBadge status={clickDayStatus} />
      </div>

      {clickDayStatus === "NONE" ? (
        <div>
          <p className="mb-3 text-sm text-gray-600">
            Quando la pratica è pronta, invia il pacchetto al partner MouseX per il Click Day.
          </p>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Note opzionali per MouseX
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
            rows={3}
            placeholder="Es. priorità alta, fascia oraria preferita…"
            className="mb-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isPending}
          />
          <p className="mb-3 text-xs text-gray-400">{notes.length}/{MAX_NOTES}</p>
          <button
            type="button"
            onClick={() => submit(notes)}
            disabled={isPending || !!blocker}
            title={blocker ?? undefined}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Invio…" : "Richiedi Click Day"}
          </button>
          {blocker ? (
            <p className="mt-2 text-xs text-amber-600">{blocker}. Approva tutti i documenti per abilitare l'invio.</p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-gray-700">
            Richiesta inviata a MouseX{lastExportAt ? ` il ${new Date(lastExportAt).toLocaleString("it-IT")}` : ""}.
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Re-invia richiesta
          </button>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
      )}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Conferma re-invio</h3>
            <p className="mb-3 text-sm text-gray-600">
              Verrà inviata una nuova email a MouseX con i dati aggiornati della pratica. Continuare?
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Note opzionali
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
              rows={3}
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isPending}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => submit(notes)}
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Invio…" : "Conferma re-invio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/click-day-section.tsx
git commit -m "feat(clickday): add ClickDaySection client component with re-send modal"
```

---

## Task 8: Wire `ClickDaySection` into consultant practice page

**Files:**
- Modify: `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx`

- [ ] **Step 1: Add the import + section**

Open `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx`. After the existing imports, add:

```ts
import { ClickDaySection } from "@/components/click-day-section";
```

Inside the page component, after the line `const uploadedDocs = practiceData.documents.filter(...)`, add:

```ts
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
```

Then in the JSX, after the "Document checklist" section closing `</div>` (the one wrapping `<DocumentChecklist />`), insert:

```tsx
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
```

- [ ] **Step 2: Update `getPractice` to include activities**

Open `apps/web/lib/actions/practices.ts`. Inside `getPractice`, the `include` block currently is:

```ts
include: { grant: true, company: { include: { companyProfile: true } }, consultant: { include: { consultantProfile: true } }, documents: { include: { documentType: true, reviewedBy: true }, orderBy: { documentType: { name: "asc" } } } },
```

Replace with:

```ts
include: {
  grant: true,
  company: { include: { companyProfile: true } },
  consultant: { include: { consultantProfile: true } },
  documents: { include: { documentType: true, reviewedBy: true }, orderBy: { documentType: { name: "asc" } } },
  activities: { where: { type: "CLICKDAY_EXPORT" }, orderBy: { createdAt: "desc" }, take: 5 },
},
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/'(dashboard)'/consulente/pratiche/'[id]'/page.tsx apps/web/lib/actions/practices.ts
git commit -m "feat(clickday): wire ClickDaySection into consultant practice page"
```

---

## Task 9: Read-only banner on company practice page

**Files:**
- Modify: `apps/web/app/(dashboard)/azienda/pratiche/[id]/page.tsx`

- [ ] **Step 1: Add the banner**

Open `apps/web/app/(dashboard)/azienda/pratiche/[id]/page.tsx`. After the existing `const missingOrRejected = ...` line, add:

```ts
const lastClickDayActivity = ((practiceData.activities ?? []) as Array<{
  type: string;
  createdAt: Date | string;
}>)
  .filter((a) => a.type === "CLICKDAY_EXPORT")
  .sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
```

Then in the JSX, just before the "Document checklist" `<div>` block, insert:

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/'(dashboard)'/azienda/pratiche/'[id]'/page.tsx
git commit -m "feat(clickday): add read-only Click Day banner on company practice page"
```

---

## Task 10: Add `MOUSEX_EMAIL` to `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Append the variable**

Open `.env.example` and add at the bottom:

```
# Click Day partner — destinatario email pacchetto Click Day
MOUSEX_EMAIL=clickday@mousex.it
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(env): document MOUSEX_EMAIL for Click Day export"
```

---

## Task 11: Manual smoke test

**Files:** None modified — verification only.

- [ ] **Step 1: Set `MOUSEX_EMAIL` in your local `.env`**

```
MOUSEX_EMAIL=your-test-inbox@example.com
```

(Use your own inbox for testing. The real MouseX address will be set in production env.)

- [ ] **Step 2: Start the dev server**

```bash
pnpm --filter web dev
```
Wait until ready on `http://localhost:3000`.

- [ ] **Step 3: Smoke checklist (consultant flow)**

Login as consultant tied to a practice on a grant with `hasClickDay=true` and **all documents APPROVED**:

1. Open `/consulente/pratiche/<id>` — section "Click Day" visible with badge "Non richiesto".
2. Type a note (e.g. "test priorità alta") in the textarea — counter updates.
3. Click "Richiedi Click Day".
4. Email arrives at `MOUSEX_EMAIL` inbox with consultant in CC. Subject `[Click Day] <grant title> — <company name>`.
5. Body contains all sections (BANDO, AZIENDA, DOCUMENTI with links, CONSULENTE, NOTE, expiry line).
6. Each document link opens the actual file (signed URL works).
7. Page refreshes: badge becomes "Inviato a MouseX", banner shows the timestamp.
8. Click "Re-invia richiesta" → modal opens. Type a different note, confirm. Second email arrives. Status remains "Inviato a MouseX". Two activity entries exist (verify in DB or `PracticeTimeline`).

Negative tests:
9. With one document in `IN_REVIEW`, the button is disabled with the tooltip explaining the blocker.
10. With `MOUSEX_EMAIL` unset, click the button → inline error "MOUSEX_EMAIL non configurato". Status NOT updated.
11. With Resend API key unset (or using an invalid key), click the button → error displayed, status NOT updated.

- [ ] **Step 4: Smoke checklist (company flow)**

Login as the company tied to the practice from step 3 (after the export succeeded):

12. Open `/azienda/pratiche/<id>` — informational banner visible with the Click Day timestamp. No interactive controls.
13. With `clickDayStatus=NONE`, the banner is absent.

- [ ] **Step 5: Run the full test suite once more**

```bash
pnpm --filter web test
pnpm --filter web exec tsc --noEmit
```
Expected: matching/click-day/grants/onboarding tests all pass. Type-check clean. (Pre-existing `document-types.test.ts` failure is unrelated.)

- [ ] **Step 6: Commit any final tweaks (if smoke uncovered issues)**

```bash
git add -A
git commit -m "chore(clickday): smoke test fixes"
```

---

## Out of scope for this plan (deferred to Phase 2)

Per the spec section 12 and the persisted memory `project_finanza_agevolata.md`:

- Bidirectional MouseX webhook (MouseX writes back into `clickDayStatus`)
- Multi-partner Click Day routing (per-grant partner email)
- Push notifications to the company when Click Day is requested
- Direct file attachments via Resend
- Auto-resend with scheduling
- `ClickDayStatus` lifecycle states beyond `REQUESTED` (`SENT_TO_PARTNER`, `SUBMITTED`, `RANKED`, `WON`, `LOST`) — UI for these states will be added when MouseX integration goes bidirectional

These remain in project memory for future iteration once MouseX agrees to API integration.
