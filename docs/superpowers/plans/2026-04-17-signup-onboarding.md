# Module B — Signup & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post-signup wizard + magic invites. Both roles finish onboarding with a concrete next action, no empty dashboards.

**Architecture:** Server-rendered wizard with state inferred from DB (`CompanyProfile` / `ConsultantProfile` / `onboardingCompletedAt`). CCIAA adapter (mock today, swappable). `ClientInvite` model + `/invite/[token]` public route. Welcome email non-blocking on signup.

**Tech Stack:** Next.js 15 App Router server components, Prisma, Zod, Resend, Vitest.

---

## File structure map

**New:**
- `packages/db/prisma/migrations/20260417000001_onboarding_and_invites/migration.sql`
- `packages/shared/src/schemas/invite.ts`
- `apps/web/lib/cciaa/types.ts`
- `apps/web/lib/cciaa/mock.ts`
- `apps/web/lib/cciaa/index.ts`
- `apps/web/lib/actions/onboarding.ts`
- `apps/web/lib/actions/invites.ts`
- `apps/web/lib/actions/invites.test.ts`
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
- `apps/web/app/invite/[token]/accept-form.tsx`

**Modified:**
- `packages/db/prisma/schema.prisma`
- `apps/web/app/(auth)/onboarding/page.tsx`
- `apps/web/lib/actions/auth.ts`
- `apps/web/lib/email.ts`
- `apps/web/middleware.ts`

---

## Task 1: Schema — onboarding fields, ClientInvite, InviteStatus

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260417000001_onboarding_and_invites/migration.sql`

- [ ] **Step 1: Add User fields**

In `packages/db/prisma/schema.prisma`, inside `model User { ... }`, add:

```prisma
  onboardingCompletedAt    DateTime?
  subscribedToGrantAlerts  Boolean   @default(false)
  clientInvitesSent        ClientInvite[] @relation("ConsultantInvites")
```

- [ ] **Step 2: Add ClientInvite model + enum**

Append to `packages/db/prisma/schema.prisma`:

```prisma
model ClientInvite {
  id               String       @id @default(cuid())
  consultantId     String
  consultant       User         @relation("ConsultantInvites", fields: [consultantId], references: [id], onDelete: Cascade)
  email            String
  token            String       @unique
  expiresAt        DateTime
  status           InviteStatus @default(PENDING)
  acceptedAt       DateTime?
  acceptedByUserId String?
  createdAt        DateTime     @default(now())

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

- [ ] **Step 3: Generate migration SQL**

Because Supabase has drift, use `prisma migrate diff`:

```bash
pnpm --filter @finagevolata/db exec prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel packages/db/prisma/schema.prisma \
  --script > packages/db/prisma/migrations/20260417000001_onboarding_and_invites/migration.sql
```

Ensure the file contains:
- `ALTER TABLE "users" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3)`
- `ALTER TABLE "users" ADD COLUMN "subscribedToGrantAlerts" BOOLEAN DEFAULT false`
- `CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')`
- `CREATE TABLE "client_invites" (...)` with indexes

- [ ] **Step 4: Apply migration**

```bash
pnpm --filter @finagevolata/db exec prisma db execute \
  --url "$DIRECT_URL" \
  --file packages/db/prisma/migrations/20260417000001_onboarding_and_invites/migration.sql
```

- [ ] **Step 5: Regenerate Prisma client**

```bash
pnpm --filter @finagevolata/db exec prisma generate
```

- [ ] **Step 6: Verify typecheck**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```

Expected: no errors. `prisma.clientInvite` and new User fields typed.

- [ ] **Step 7: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260417000001_onboarding_and_invites
git commit -m "feat(db): ClientInvite model + onboarding state on User"
```

---

## Task 2: Shared invite schema + CCIAA adapter

**Files:**
- Create: `packages/shared/src/schemas/invite.ts`
- Modify: `packages/shared/src/schemas/index.ts`
- Create: `apps/web/lib/cciaa/types.ts`
- Create: `apps/web/lib/cciaa/mock.ts`
- Create: `apps/web/lib/cciaa/index.ts`

- [ ] **Step 1: Invite schema**

Create `packages/shared/src/schemas/invite.ts`:

```typescript
import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email("Email non valida"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(32),
  name: z.string().min(2, "Nome troppo corto").max(100),
  password: z.string().min(8, "Password troppo corta"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
```

- [ ] **Step 2: Export from schemas barrel**

Edit `packages/shared/src/schemas/index.ts`, append:

```typescript
export * from "./invite";
```

- [ ] **Step 3: CCIAA types**

Create `apps/web/lib/cciaa/types.ts`:

```typescript
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

- [ ] **Step 4: Mock provider**

Create `apps/web/lib/cciaa/mock.ts`:

```typescript
import type { CciaaData, CciaaProvider } from "./types";

const SAMPLES: CciaaData[] = [
  { companyName: "Rossi Meccanica Srl", legalForm: "SRL", atecoCode: "28.99", atecoDescription: "Fabbricazione di altre macchine per impieghi speciali", province: "MI", region: "Lombardia" },
  { companyName: "Bianchi Consulting SAS", legalForm: "SAS", atecoCode: "70.22", atecoDescription: "Consulenza imprenditoriale e altra consulenza amministrativo-gestionale", province: "RM", region: "Lazio" },
  { companyName: "Verdi Agricola SRL", legalForm: "SRL", atecoCode: "01.11", atecoDescription: "Coltivazione di cereali", province: "BO", region: "Emilia-Romagna" },
  { companyName: "Neri Tech Srls", legalForm: "SRLS", atecoCode: "62.01", atecoDescription: "Produzione di software non connesso all'edizione", province: "TO", region: "Piemonte" },
];

export class MockCciaaProvider implements CciaaProvider {
  async lookup(vatNumber: string): Promise<CciaaData | null> {
    if (!/^\d{11}$/.test(vatNumber)) return null;
    const lastDigit = Number(vatNumber[vatNumber.length - 1]);
    return SAMPLES[lastDigit % SAMPLES.length];
  }
}
```

- [ ] **Step 5: Provider factory**

Create `apps/web/lib/cciaa/index.ts`:

```typescript
import { MockCciaaProvider } from "./mock";
import type { CciaaProvider } from "./types";

export type { CciaaData, CciaaProvider } from "./types";

let cached: CciaaProvider | null = null;

export function getCciaaProvider(): CciaaProvider {
  if (cached) return cached;
  const kind = process.env.CCIAA_PROVIDER ?? "mock";
  switch (kind) {
    case "mock":
    default:
      cached = new MockCciaaProvider();
  }
  return cached;
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/schemas/invite.ts packages/shared/src/schemas/index.ts apps/web/lib/cciaa
git commit -m "feat: invite schema + CCIAA provider adapter (mock impl)"
```

---

## Task 3: Invite actions (TDD)

**Files:**
- Create: `apps/web/lib/actions/invites.ts`
- Create: `apps/web/lib/actions/invites.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/lib/actions/invites.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    clientInvite: {
      create: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    consultantCompany: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => fn({
      clientInvite: { update: vi.fn(async (a: any) => a) },
      user: { create: vi.fn(async (a: any) => ({ id: "new-user", ...a.data })) },
      consultantCompany: { create: vi.fn(async (a: any) => a) },
    })),
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
  sendClientInviteEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "consultant-1", role: "CONSULTANT", name: "Mario Rossi" },
  })),
}));

import { createClientInvite, acceptInvite } from "./invites";
import { prisma } from "@/lib/prisma";
import { sendClientInviteEmail } from "@/lib/email";
import { auth } from "@/lib/auth";

describe("createClientInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "consultant-1", role: "CONSULTANT", name: "Mario Rossi" } });
  });

  it("rejects invalid email", async () => {
    await expect(createClientInvite({ email: "not-an-email" })).rejects.toThrow();
  });

  it("rejects non-consultant caller", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u", role: "COMPANY" } });
    await expect(createClientInvite({ email: "a@b.it" })).rejects.toThrow(/non autorizzato/i);
  });

  it("rejects when hourly rate limit exceeded", async () => {
    (prisma.clientInvite.count as any).mockResolvedValueOnce(10);
    await expect(createClientInvite({ email: "a@b.it" })).rejects.toThrow(/limite/i);
  });

  it("creates invite with hex token + 7d expiry + sends email", async () => {
    (prisma.clientInvite.count as any).mockResolvedValueOnce(0);
    (prisma.clientInvite.create as any).mockResolvedValueOnce({ id: "inv1", token: "t".repeat(64) });

    const result = await createClientInvite({ email: "cliente@pmi.it" });

    expect(result).toEqual({ ok: true });
    const call = (prisma.clientInvite.create as any).mock.calls[0][0];
    expect(call.data.email).toBe("cliente@pmi.it");
    expect(call.data.consultantId).toBe("consultant-1");
    expect(call.data.token).toHaveLength(64);
    const ttlMs = call.data.expiresAt.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(6 * 24 * 3600 * 1000);
    expect(ttlMs).toBeLessThan(8 * 24 * 3600 * 1000);
    expect(sendClientInviteEmail).toHaveBeenCalled();
  });
});

describe("acceptInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unknown token", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce(null);
    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/non valido/i);
  });

  it("rejects expired invite", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "i", consultantId: "c", email: "a@b.it", status: "PENDING",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/scaduto/i);
  });

  it("rejects already-accepted invite", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "i", consultantId: "c", email: "a@b.it", status: "ACCEPTED",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/già utilizzato/i);
  });

  it("creates COMPANY user, ConsultantCompany link, marks invite ACCEPTED", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "inv1", consultantId: "cons1", email: "cliente@pmi.it", status: "PENDING",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);

    const result = await acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" });

    expect(result).toEqual({ ok: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rejects if email already has a user", async () => {
    (prisma.clientInvite.findUnique as any).mockResolvedValueOnce({
      id: "inv1", consultantId: "cons1", email: "cliente@pmi.it", status: "PENDING",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: "existing" });

    await expect(
      acceptInvite({ token: "x".repeat(64), name: "Luigi", password: "password123" }),
    ).rejects.toThrow(/già registrata/i);
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

```bash
pnpm --filter @finagevolata/web test -- apps/web/lib/actions/invites.test.ts
```

Expected: FAIL (module `./invites` not found).

- [ ] **Step 3: Implement actions**

Create `apps/web/lib/actions/invites.ts`:

```typescript
"use server";

import crypto from "crypto";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendClientInviteEmail } from "@/lib/email";
import { createInviteSchema, acceptInviteSchema } from "@finagevolata/shared";

const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;
const HOURLY_LIMIT = 10;

export async function createClientInvite(input: unknown): Promise<{ ok: true }> {
  const parsed = createInviteSchema.parse(input);

  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string } | undefined;
  if (!user?.id || user.role !== "CONSULTANT") {
    throw new Error("Non autorizzato");
  }

  const recentCount = await prisma.clientInvite.count({
    where: {
      consultantId: user.id,
      createdAt: { gte: new Date(Date.now() - 3600_000) },
    },
  });
  if (recentCount >= HOURLY_LIMIT) {
    throw new Error("Limite invio inviti superato. Riprova tra un'ora.");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.clientInvite.create({
    data: {
      consultantId: user.id,
      email: parsed.email,
      token,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://axentraitalia.cloud";
  await sendClientInviteEmail({
    to: parsed.email,
    consultantName: user.name ?? "Un consulente",
    link: `${baseUrl}/invite/${token}`,
  });

  return { ok: true };
}

export async function acceptInvite(input: unknown): Promise<{ ok: true }> {
  const parsed = acceptInviteSchema.parse(input);

  const invite = await prisma.clientInvite.findUnique({ where: { token: parsed.token } });
  if (!invite) throw new Error("Invito non valido.");
  if (invite.status === "ACCEPTED") throw new Error("Invito già utilizzato.");
  if (invite.status === "REVOKED") throw new Error("Invito revocato.");
  if (invite.expiresAt.getTime() < Date.now()) throw new Error("Invito scaduto.");

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) throw new Error("Email già registrata. Accedi invece.");

  const hashed = await hash(parsed.password, 12);

  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: invite.email,
        name: parsed.name,
        password: hashed,
        role: "COMPANY",
        plan: "FREE",
      },
    });
    await tx.consultantCompany.create({
      data: {
        consultantId: invite.consultantId,
        companyId: newUser.id,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
    await tx.clientInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: newUser.id,
      },
    });
  });

  return { ok: true };
}
```

- [ ] **Step 4: Add email helper (temporarily stub if needed)**

Edit `apps/web/lib/email.ts`, append:

```typescript
export async function sendClientInviteEmail({ to, consultantName, link }: { to: string; consultantName: string; link: string }) {
  return sendEmail({
    to,
    subject: `${consultantName} ti ha invitato su FinAgevolata`,
    text: `Ciao,

${consultantName} ti ha invitato a collaborare su FinAgevolata — la piattaforma dove consulente e azienda lavorano insieme sui bandi di finanza agevolata.

Clicca il link per creare l'account (scade in 7 giorni):
${link}

Se non conosci ${consultantName}, ignora questa email.
`,
  });
}

export async function sendWelcomeEmail({ to, name, role }: { to: string; name: string; role: "COMPANY" | "CONSULTANT" }) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://axentraitalia.cloud";
  const subject = role === "CONSULTANT"
    ? "Benvenuto su FinAgevolata, consulente"
    : "Benvenuto su FinAgevolata";
  const ctaUrl = role === "CONSULTANT" ? `${baseUrl}/onboarding/consulente` : `${baseUrl}/onboarding`;
  const ctaLabel = role === "CONSULTANT" ? "Configura lo studio" : "Completa il profilo";
  const text = `Ciao ${name},

Grazie per esserti registrato su FinAgevolata.

Ti bastano 2 minuti per finire il setup: ${ctaLabel} → ${ctaUrl}

Se hai domande, rispondi a questa email.
`;
  return sendEmail({ to, subject, text });
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm --filter @finagevolata/web test
```

Expected: 6 contact + 5 invite-create + 5 invite-accept — all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/actions/invites.ts apps/web/lib/actions/invites.test.ts apps/web/lib/email.ts
git commit -m "feat(invites): createClientInvite + acceptInvite with rate limit + tests"
```

---

## Task 4: Onboarding actions

**Files:**
- Create: `apps/web/lib/actions/onboarding.ts`

- [ ] **Step 1: Create actions file**

Create `apps/web/lib/actions/onboarding.ts`:

```typescript
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const CompanyProfileSchema = z.object({
  vatNumber: z.string().regex(/^\d{11}$/, "P.IVA deve essere 11 cifre"),
  companyName: z.string().min(2),
  legalForm: z.string().min(1),
  atecoCode: z.string().min(2),
  atecoDescription: z.string().min(2),
  province: z.string().length(2, "Sigla provincia 2 lettere"),
  region: z.string().min(2),
  employeeCount: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]),
});

export async function saveCompanyProfile(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = CompanyProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await prisma.companyProfile.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  return { success: true };
}

export async function saveInterests(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const subscribe = formData.get("subscribe") === "on";

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscribedToGrantAlerts: subscribe,
      onboardingCompletedAt: new Date(),
    },
  });

  redirect("/azienda");
}

const ConsultantProfileSchema = z.object({
  firmName: z.string().min(2),
  specializations: z.array(z.string()).optional(),
  maxClients: z.coerce.number().int().min(1).max(1000),
});

export async function saveConsultantProfile(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const raw = {
    firmName: formData.get("firmName"),
    specializations: formData.getAll("specializations"),
    maxClients: formData.get("maxClients"),
  };
  const parsed = ConsultantProfileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await prisma.consultantProfile.upsert({
    where: { userId },
    create: {
      userId,
      firmName: parsed.data.firmName,
      specializations: parsed.data.specializations ?? [],
      maxClients: parsed.data.maxClients,
    },
    update: {
      firmName: parsed.data.firmName,
      specializations: parsed.data.specializations ?? [],
      maxClients: parsed.data.maxClients,
    },
  });

  return { success: true };
}

export async function finishConsultantOnboarding() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  });

  redirect("/consulente");
}

export async function lookupVat(vatNumber: string) {
  const { getCciaaProvider } = await import("@/lib/cciaa");
  const provider = getCciaaProvider();
  return provider.lookup(vatNumber);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/actions/onboarding.ts
git commit -m "feat(onboarding): actions for company+consultant wizard steps"
```

---

## Task 5: Wizard UI primitives

**Files:**
- Create: `apps/web/components/onboarding/step-indicator.tsx`
- Create: `apps/web/components/onboarding/wizard-shell.tsx`

- [ ] **Step 1: StepIndicator**

Create `apps/web/components/onboarding/step-indicator.tsx`:

```tsx
interface StepIndicatorProps {
  current: number;
  total: number;
  labels: string[];
}

export function StepIndicator({ current, total, labels }: StepIndicatorProps) {
  return (
    <ol className="mb-8 flex items-center justify-between gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "upcoming";
        return (
          <li key={n} className="flex flex-1 items-center gap-2">
            <span
              className={
                state === "done"
                  ? "flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
                  : state === "active"
                    ? "flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white ring-4 ring-indigo-200"
                    : "flex size-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-500"
              }
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={state === "upcoming" ? "text-sm text-slate-400" : "text-sm font-medium text-slate-700"}>
              {labels[i]}
            </span>
            {n < total ? <span className="mx-2 h-px flex-1 bg-slate-200" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2: WizardShell**

Create `apps/web/components/onboarding/wizard-shell.tsx`:

```tsx
import { StepIndicator } from "./step-indicator";

interface WizardShellProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  labels: string[];
  children: React.ReactNode;
}

export function WizardShell({ title, subtitle, currentStep, totalSteps, labels, children }: WizardShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-white px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <StepIndicator current={currentStep} total={totalSteps} labels={labels} />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-slate-600">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/onboarding
git commit -m "feat(onboarding): wizard shell + step indicator primitives"
```

---

## Task 6: COMPANY wizard steps (3)

**Files:**
- Create: `apps/web/app/(auth)/onboarding/steps/welcome-company.tsx`
- Create: `apps/web/app/(auth)/onboarding/steps/vat-profile.tsx`
- Create: `apps/web/app/(auth)/onboarding/steps/interests.tsx`

- [ ] **Step 1: Welcome step**

Create `apps/web/app/(auth)/onboarding/steps/welcome-company.tsx`:

```tsx
import Link from "next/link";
import { WizardShell } from "@/components/onboarding/wizard-shell";

export function WelcomeCompanyStep() {
  return (
    <WizardShell
      title="Benvenuto in FinAgevolata."
      subtitle="2 minuti per completare il profilo. Poi ti mostriamo i bandi giusti per te."
      currentStep={1}
      totalSteps={3}
      labels={["Benvenuto", "Profilo", "Interessi"]}
    >
      <ul className="space-y-3 text-sm text-slate-700">
        <li className="flex gap-3"><span className="text-indigo-600">1.</span> Inserisci la P.IVA — auto-compiliamo i dati camerali.</li>
        <li className="flex gap-3"><span className="text-indigo-600">2.</span> Scegli se ricevere avvisi bandi.</li>
        <li className="flex gap-3"><span className="text-indigo-600">3.</span> Entri in dashboard e inizi a caricare documenti.</li>
      </ul>
      <Link
        href="/onboarding?step=2"
        className="mt-8 inline-block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Inizia
      </Link>
    </WizardShell>
  );
}
```

- [ ] **Step 2: VAT + profile step (client component with autofill)**

Create `apps/web/app/(auth)/onboarding/steps/vat-profile.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ITALIAN_REGIONS } from "@finagevolata/shared";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { saveCompanyProfile, lookupVat } from "@/lib/actions/onboarding";

export function VatProfileStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [vat, setVat] = useState("");
  const [prefill, setPrefill] = useState<Record<string, string> | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [error, setError] = useState("");

  async function handleLookup() {
    setLookupError("");
    if (!/^\d{11}$/.test(vat)) {
      setLookupError("P.IVA deve essere 11 cifre.");
      return;
    }
    startTransition(async () => {
      const data = await lookupVat(vat);
      if (!data) {
        setLookupError("Non trovata. Compila manualmente.");
        setPrefill({});
      } else {
        setPrefill(data as Record<string, string>);
      }
    });
  }

  async function handleSubmit(formData: FormData) {
    formData.set("vatNumber", vat);
    const result = await saveCompanyProfile(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/onboarding?step=3");
    }
  }

  return (
    <WizardShell
      title="Dati aziendali"
      subtitle="Inserisci la P.IVA per auto-compilare, poi controlla i campi."
      currentStep={2}
      totalSteps={3}
      labels={["Benvenuto", "Profilo", "Interessi"]}
    >
      <div className="mb-6 flex gap-2">
        <input
          value={vat}
          onChange={(e) => setVat(e.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="P.IVA (11 cifre)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="button"
          onClick={handleLookup}
          disabled={pending || vat.length !== 11}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Cerco..." : "Auto-compila"}
        </button>
      </div>

      {lookupError ? <p className="mb-4 text-sm text-amber-700">{lookupError}</p> : null}

      {prefill ? (
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ragione sociale</label>
            <input name="companyName" required defaultValue={prefill.companyName ?? ""} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Forma giuridica</label>
              <select name="legalForm" required defaultValue={prefill.legalForm ?? ""} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Seleziona</option>
                <option value="SRL">SRL</option>
                <option value="SRLS">SRLS</option>
                <option value="SPA">SPA</option>
                <option value="SNC">SNC</option>
                <option value="SAS">SAS</option>
                <option value="DITTA_INDIVIDUALE">Ditta individuale</option>
                <option value="COOPERATIVA">Cooperativa</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dimensione</label>
              <select name="employeeCount" required className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Seleziona</option>
                <option value="MICRO">Micro (&lt;10)</option>
                <option value="SMALL">Piccola (10-49)</option>
                <option value="MEDIUM">Media (50-249)</option>
                <option value="LARGE">Grande (250+)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Codice ATECO</label>
              <input name="atecoCode" required defaultValue={prefill.atecoCode ?? ""} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Descrizione ATECO</label>
              <input name="atecoDescription" required defaultValue={prefill.atecoDescription ?? ""} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Regione</label>
              <select name="region" required defaultValue={prefill.region ?? ""} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">Seleziona</option>
                {ITALIAN_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Provincia</label>
              <input name="province" required maxLength={2} defaultValue={prefill.province ?? ""} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" />
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            Continua
          </button>
        </form>
      ) : null}
    </WizardShell>
  );
}
```

- [ ] **Step 3: Interests step**

Create `apps/web/app/(auth)/onboarding/steps/interests.tsx`:

```tsx
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { saveInterests } from "@/lib/actions/onboarding";

export function InterestsStep() {
  return (
    <WizardShell
      title="Ultimo passaggio"
      subtitle="Vuoi ricevere un'email quando esce un bando compatibile col tuo profilo?"
      currentStep={3}
      totalSteps={3}
      labels={["Benvenuto", "Profilo", "Interessi"]}
    >
      <form action={saveInterests} className="space-y-6">
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-indigo-300">
          <input type="checkbox" name="subscribe" defaultChecked className="mt-1 size-4" />
          <div>
            <div className="font-medium text-slate-900">Notifiche bandi</div>
            <div className="text-sm text-slate-600">Ti avvisiamo via email quando esce un bando compatibile con il tuo codice ATECO e la tua regione.</div>
          </div>
        </label>

        <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          Finisci e vai alla dashboard
        </button>
      </form>
    </WizardShell>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(auth\)/onboarding/steps
git commit -m "feat(onboarding): 3 COMPANY wizard step components"
```

---

## Task 7: COMPANY orchestrator page (server-inferred step)

**Files:**
- Modify: `apps/web/app/(auth)/onboarding/page.tsx`

- [ ] **Step 1: Replace with server component orchestrator**

Overwrite `apps/web/app/(auth)/onboarding/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WelcomeCompanyStep } from "./steps/welcome-company";
import { VatProfileStep } from "./steps/vat-profile";
import { InterestsStep } from "./steps/interests";

interface PageProps {
  searchParams: Promise<{ step?: string }>;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { step: stepRaw } = await searchParams;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; onboardingCompletedAt?: string | null } | undefined;
  if (!user?.id) redirect("/login");
  if (user.role === "CONSULTANT") redirect("/onboarding/consulente");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { companyProfile: true },
  });

  if (dbUser?.onboardingCompletedAt) redirect("/azienda");

  const requested = Number(stepRaw);
  const inferred = dbUser?.companyProfile ? 3 : 1;
  const step = [1, 2, 3].includes(requested) ? requested : inferred;

  if (step === 1) return <WelcomeCompanyStep />;
  if (step === 2) return <VatProfileStep />;
  return <InterestsStep />;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json
```

Expected: no errors. (If `companyProfile` relation on User doesn't exist in Prisma client types, see Task 1 — ensure `prisma generate` was run.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(auth\)/onboarding/page.tsx
git commit -m "feat(onboarding): server-inferred step router for COMPANY wizard"
```

---

## Task 8: CONSULENTE wizard

**Files:**
- Create: `apps/web/app/(auth)/onboarding/consulente/page.tsx`
- Create: `apps/web/app/(auth)/onboarding/consulente/steps/welcome-consultant.tsx`
- Create: `apps/web/app/(auth)/onboarding/consulente/steps/studio.tsx`
- Create: `apps/web/app/(auth)/onboarding/consulente/steps/first-client.tsx`

- [ ] **Step 1: Welcome**

Create `apps/web/app/(auth)/onboarding/consulente/steps/welcome-consultant.tsx`:

```tsx
import Link from "next/link";
import { WizardShell } from "@/components/onboarding/wizard-shell";

export function WelcomeConsultantStep() {
  return (
    <WizardShell
      title="Benvenuto, consulente."
      subtitle="Configura lo studio e invita il primo cliente. Ti facciamo risparmiare 10 ore di email."
      currentStep={1}
      totalSteps={3}
      labels={["Benvenuto", "Studio", "Primo cliente"]}
    >
      <ul className="space-y-3 text-sm text-slate-700">
        <li className="flex gap-3"><span className="text-indigo-600">1.</span> Dati dello studio — nome, specializzazioni, capacità.</li>
        <li className="flex gap-3"><span className="text-indigo-600">2.</span> Invita il primo cliente via email.</li>
        <li className="flex gap-3"><span className="text-indigo-600">3.</span> Entri in dashboard con tutto pronto.</li>
      </ul>
      <Link
        href="/onboarding/consulente?step=2"
        className="mt-8 inline-block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Inizia
      </Link>
    </WizardShell>
  );
}
```

- [ ] **Step 2: Studio step**

Create `apps/web/app/(auth)/onboarding/consulente/steps/studio.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { saveConsultantProfile } from "@/lib/actions/onboarding";

const SPECIALIZATIONS = ["Manifattura", "Servizi", "Agricoltura", "Turismo", "Tech", "Altro"];

export function StudioStep() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    const result = await saveConsultantProfile(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/onboarding/consulente?step=3");
    }
  }

  return (
    <WizardShell
      title="Il tuo studio"
      currentStep={2}
      totalSteps={3}
      labels={["Benvenuto", "Studio", "Primo cliente"]}
    >
      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome studio / freelance</label>
          <input name="firmName" required minLength={2} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Specializzazioni</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALIZATIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-indigo-300">
                <input type="checkbox" name="specializations" value={s} className="size-4" />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Numero massimo clienti gestibili</label>
          <input name="maxClients" type="number" defaultValue={20} min={1} max={1000} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-slate-500">Puoi modificarlo in qualsiasi momento.</p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          Continua
        </button>
      </form>
    </WizardShell>
  );
}
```

- [ ] **Step 3: First client step**

Create `apps/web/app/(auth)/onboarding/consulente/steps/first-client.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { createClientInvite } from "@/lib/actions/invites";
import { finishConsultantOnboarding } from "@/lib/actions/onboarding";

export function FirstClientStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite() {
    setError("");
    startTransition(async () => {
      try {
        await createClientInvite({ email });
        setSent(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  async function handleSkip() {
    await finishConsultantOnboarding();
  }

  return (
    <WizardShell
      title="Invita il primo cliente"
      subtitle="Un'email + un link: il cliente crea l'account e vi collega automaticamente."
      currentStep={3}
      totalSteps={3}
      labels={["Benvenuto", "Studio", "Primo cliente"]}
    >
      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-emerald-900">Invito inviato a {email}.</h3>
          <p className="mt-2 text-sm text-emerald-800">Scade tra 7 giorni.</p>
          <button
            onClick={() => router.push("/consulente")}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Vai alla dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@cliente.it"
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={handleInvite}
            disabled={pending || !email}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Invio..." : "Invia invito"}
          </button>
          <form action={handleSkip}>
            <button type="submit" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Salta per ora
            </button>
          </form>
        </div>
      )}
    </WizardShell>
  );
}
```

- [ ] **Step 4: Orchestrator page**

Create `apps/web/app/(auth)/onboarding/consulente/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WelcomeConsultantStep } from "./steps/welcome-consultant";
import { StudioStep } from "./steps/studio";
import { FirstClientStep } from "./steps/first-client";

interface PageProps {
  searchParams: Promise<{ step?: string }>;
}

export default async function ConsultantOnboardingPage({ searchParams }: PageProps) {
  const { step: stepRaw } = await searchParams;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login");
  if (user.role !== "CONSULTANT") redirect("/onboarding");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { consultantProfile: true },
  });

  if (dbUser?.onboardingCompletedAt) redirect("/consulente");

  const requested = Number(stepRaw);
  const inferred = dbUser?.consultantProfile ? 3 : 1;
  const step = [1, 2, 3].includes(requested) ? requested : inferred;

  if (step === 1) return <WelcomeConsultantStep />;
  if (step === 2) return <StudioStep />;
  return <FirstClientStep />;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(auth\)/onboarding/consulente
git commit -m "feat(onboarding): CONSULENTE 3-step wizard with invite"
```

---

## Task 9: Invite accept route

**Files:**
- Create: `apps/web/app/invite/[token]/page.tsx`
- Create: `apps/web/app/invite/[token]/accept-form.tsx`

- [ ] **Step 1: Accept form (client component)**

Create `apps/web/app/invite/[token]/accept-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions/invites";

interface Props {
  token: string;
  email: string;
  consultantName: string;
}

export function AcceptForm({ token, email, consultantName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await acceptInvite({
          token,
          name: String(formData.get("name") ?? ""),
          password: String(formData.get("password") ?? ""),
        });
        router.push("/login?invited=1");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-800">
        <strong>{consultantName}</strong> ti invita a usare FinAgevolata insieme.
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input value={email} disabled className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Nome e cognome</label>
        <input name="name" required minLength={2} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input name="password" type="password" required minLength={8} className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
        {pending ? "Creo account..." : "Crea account"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Server page**

Create `apps/web/app/invite/[token]/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { AcceptForm } from "./accept-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: { consultant: { select: { name: true } } },
  });

  const invalid = !invite
    || invite.status !== "PENDING"
    || invite.expiresAt.getTime() < Date.now();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-white px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {invalid ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Invito non valido o scaduto.</h1>
            <p className="mt-2 text-sm text-slate-600">Chiedi al tuo consulente di inviartene uno nuovo.</p>
            <a href="/register" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:underline">Oppure registrati normalmente →</a>
          </div>
        ) : (
          <>
            <h1 className="mb-6 text-2xl font-bold text-slate-900">Crea il tuo account</h1>
            <AcceptForm
              token={token}
              email={invite!.email}
              consultantName={invite!.consultant.name ?? "Il tuo consulente"}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/invite
git commit -m "feat(invites): /invite/[token] accept route + form"
```

---

## Task 10: Welcome email trigger + middleware allowlist

**Files:**
- Modify: `apps/web/lib/actions/auth.ts`
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Trigger welcome email in register**

Edit `apps/web/lib/actions/auth.ts`. At top imports, add:

```typescript
import { sendWelcomeEmail } from "@/lib/email";
```

Inside `registerUser`, after `await prisma.user.create({ ... })` and before `return { success: true }`, replace the create with:

```typescript
  const created = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashedPassword,
      role: parsed.data.role,
      plan: parsed.data.plan ? slugToPlanEnum(parsed.data.plan) : "FREE",
    },
  });

  // Non-blocking: welcome email failure does not fail signup
  sendWelcomeEmail({ to: created.email, name: created.name, role: created.role as "COMPANY" | "CONSULTANT" })
    .catch((err) => console.error("Welcome email failed:", err));

  return { success: true };
}
```

- [ ] **Step 2: Middleware — allow /invite public**

Edit `apps/web/middleware.ts`. At the top of the `auth((req) => { ... })` body (after extracting pathname/isLoggedIn/role), add:

```typescript
  if (pathname.startsWith("/invite/")) {
    return NextResponse.next();
  }
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter @finagevolata/web build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/actions/auth.ts apps/web/middleware.ts
git commit -m "feat(auth): welcome email on signup + /invite public in middleware"
```

---

## Task 11: Full test run + smoke + push

**Files:** none new.

- [ ] **Step 1: Full test suite**

```bash
pnpm test
```

Expected: all existing + new invite tests pass (≥ 33 total).

- [ ] **Step 2: Local smoke**

```bash
pnpm --filter @finagevolata/web dev
```

Checks:
1. Register as COMPANY → email received (check Resend log) → click link → `/onboarding` step 1 → next → step 2: enter `12345678901` → auto-fill → submit → step 3 → redirect `/azienda`.
2. Register as CONSULENTE → `/onboarding/consulente` → studio → invite your-second-email → email arrives.
3. Open invite link in incognito → signup form prefilled → submit → `/login?invited=1` → login → `/azienda` visible; check DB `consultant_companies` has the link row.
4. Expired invite (set `expiresAt = now() - 1 day` in psql) → "Invito scaduto" page.
5. Resume: reload `/onboarding` mid-flow (after saving profile) → lands on step 3.

- [ ] **Step 3: Push**

```bash
git push origin main
```

Wait for Vercel deploy. Confirm env vars set:
- `NEXTAUTH_URL` (production URL)
- `RESEND_API_KEY`
- `EMAIL_FROM`

- [ ] **Step 4: Production smoke**

Repeat test (1) on production. Verify welcome email + invite email arrive at real inboxes.

---

## Self-Review

**Spec coverage:**
- §2 Architecture: Tasks 7 + 8 (server orchestrators), Task 5 (primitives), Task 2 (CCIAA), Task 3 (invites).
- §3 Schema: Task 1.
- §4 COMPANY wizard: Tasks 6 + 7.
- §5 CONSULENTE wizard: Task 8.
- §6 Magic invite: Tasks 3 + 9.
- §7 Welcome email: Task 10.
- §8 CCIAA adapter: Task 2.
- §9 Files: spread across all tasks.
- §10 Testing: Task 3 (unit), Task 11 (smoke).

**Placeholder scan:** none — every step has full code.

**Type consistency:**
- `InviteStatus` enum used as Prisma type in `acceptInvite` guards matches schema.
- `createInviteSchema` and `acceptInviteSchema` exported from shared — consumed in invites action tests + forms.
- `sendClientInviteEmail` / `sendWelcomeEmail` signatures match callsites.
- `ConsultantCompany` fields (`status`, `acceptedAt`) match existing schema (Task 0 / pre-existing).
- Step numbers 1/2/3 consistent across wizard orchestrators and searchParams parsing.
