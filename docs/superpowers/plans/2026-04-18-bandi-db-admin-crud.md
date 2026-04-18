# Module C1 — Bandi DB + Admin CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship admin bootstrap, DocumentType seed, full Grant + DocumentType CRUD with consultant submission + approval workflow, and public read-only grant lists for company/consultant portals.

**Architecture:** Next.js 15 App Router with Server Actions gated by role; single `grant-form.tsx` shared by admin and consultant (mode prop toggles admin-only fields); Prisma 6 + existing schema (no migration); email via existing `sendEmail()` helper; Vitest unit tests for server actions and Zod refinements.

**Tech Stack:** Next.js 15, React 19, Prisma 6, Supabase PostgreSQL, NextAuth.js v5, Zod, Tailwind CSS, Resend, Vitest 3, pnpm workspaces + Turborepo.

**Spec:** `docs/superpowers/specs/2026-04-18-bandi-db-admin-crud-design.md`

---

## File Structure

```
apps/web/
├── app/(dashboard)/
│   ├── admin/
│   │   ├── layout.tsx                       # MODIFY: add sidebar with links
│   │   ├── page.tsx                         # MODIFY: overview cards
│   │   ├── bandi/
│   │   │   ├── page.tsx                     # NEW: list + filters
│   │   │   ├── new/page.tsx                 # NEW: create form
│   │   │   ├── [id]/page.tsx                # NEW: detail + edit + actions
│   │   │   └── queue/page.tsx               # NEW: approval queue
│   │   └── documenti/
│   │       ├── page.tsx                     # NEW: list + new form
│   │       └── [id]/page.tsx                # NEW: edit
│   ├── consulente/bandi/
│   │   ├── page.tsx                         # OVERWRITE stub
│   │   ├── new/page.tsx                     # NEW: submission form
│   │   └── [id]/page.tsx                    # NEW: detail
│   └── azienda/bandi/
│       ├── page.tsx                         # OVERWRITE stub
│       └── [id]/page.tsx                    # NEW: detail
├── components/
│   ├── admin/
│   │   └── admin-sidebar.tsx                # NEW
│   ├── bandi/
│   │   ├── grant-form.tsx                   # NEW: shared admin+consultant
│   │   ├── grant-list-card.tsx              # NEW
│   │   ├── grant-filters.tsx                # NEW: client, URL-synced
│   │   ├── doc-requirement-picker.tsx       # NEW: multi-select DocumentType
│   │   ├── approve-button.tsx               # NEW
│   │   ├── reject-dialog.tsx                # NEW
│   │   └── publish-button.tsx               # NEW
│   └── documenti/
│       └── doc-type-form.tsx                # NEW
├── lib/
│   ├── actions/
│   │   ├── grants.ts                        # NEW
│   │   ├── grants.test.ts                   # NEW
│   │   ├── document-types.ts                # NEW
│   │   └── document-types.test.ts           # NEW
│   ├── auth.ts                              # MODIFY: admin auto-promote
│   └── email.ts                             # APPEND: 2 grant emails
│
packages/
├── shared/src/schemas/
│   ├── grant.ts                             # MODIFY: refinements + update schema
│   ├── grant.test.ts                        # NEW
│   ├── document-type.ts                     # NEW
│   └── index.ts                             # APPEND: export "./document-type"
└── db/prisma/
    └── seed.ts                              # NEW
```

---

## Task 1: Admin Bootstrap via ADMIN_EMAILS

**Files:**
- Modify: `apps/web/lib/auth.ts`
- Create: `apps/web/lib/admin-bootstrap.ts`
- Create: `apps/web/lib/admin-bootstrap.test.ts`
- Modify: `.env.example` (root)

- [ ] **Step 1: Write failing test for getAdminEmails**

Create `apps/web/lib/admin-bootstrap.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAdminEmails, isAdminEmail } from "./admin-bootstrap";

describe("getAdminEmails", () => {
  const originalEnv = process.env.ADMIN_EMAILS;
  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv;
  });

  it("returns empty array when env var missing", () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAdminEmails()).toEqual([]);
  });

  it("splits comma-separated and lowercases", () => {
    process.env.ADMIN_EMAILS = "A@x.com, b@Y.com , c@z.com";
    expect(getAdminEmails()).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
  });

  it("filters empty entries", () => {
    process.env.ADMIN_EMAILS = "a@x.com,,b@y.com,";
    expect(getAdminEmails()).toEqual(["a@x.com", "b@y.com"]);
  });
});

describe("isAdminEmail", () => {
  it("returns true when email in ADMIN_EMAILS (case insensitive)", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("ADMIN@test.com")).toBe(true);
  });

  it("returns false when email not in ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "admin@test.com";
    expect(isAdminEmail("other@test.com")).toBe(false);
  });

  it("returns false when env empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("admin@test.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- admin-bootstrap
```

Expected: FAIL — "Cannot find module './admin-bootstrap'".

- [ ] **Step 3: Create admin-bootstrap.ts**

```typescript
// apps/web/lib/admin-bootstrap.ts
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test -- admin-bootstrap
```

Expected: PASS (6 tests).

- [ ] **Step 5: Modify auth.ts to auto-promote on login**

Edit `apps/web/lib/auth.ts`. Inside the `Credentials.authorize` function, after `passwordMatch` check, before the return statement, replace this block:

```typescript
const passwordMatch = await compare(parsed.data.password, user.password);
if (!passwordMatch) return null;

return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
};
```

With:

```typescript
const passwordMatch = await compare(parsed.data.password, user.password);
if (!passwordMatch) return null;

// Auto-promote ADMIN_EMAILS on login (idempotent: only writes when role mismatches)
const { isAdminEmail } = await import("./admin-bootstrap");
let effectiveRole = user.role;
if (isAdminEmail(user.email) && user.role !== "ADMIN") {
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
  effectiveRole = "ADMIN";
}

return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: effectiveRole,
};
```

- [ ] **Step 6: Append ADMIN_EMAILS to .env.example**

Append to `/Users/carlospenaranda/Proggetto_finanza_agevolata/.env.example`:

```
# Comma-separated emails auto-promoted to ADMIN on next login
ADMIN_EMAILS=
```

- [ ] **Step 7: Run full test + build**

```bash
cd /Users/carlospenaranda/Proggetto_finanza_agevolata
pnpm --filter web test
pnpm --filter web build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/admin-bootstrap.ts apps/web/lib/admin-bootstrap.test.ts apps/web/lib/auth.ts .env.example
git commit -m "feat(auth): auto-promote ADMIN_EMAILS on credential login

Adds env-driven admin bootstrap. On sign-in, if the user's email
appears in ADMIN_EMAILS (comma-separated, case-insensitive) and their
stored role differs from ADMIN, updates the row and returns the new
role in the session. Idempotent: zero DB writes when role matches.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: DocumentType Seed Script

**Files:**
- Create: `packages/db/prisma/seed.ts`
- Modify: `packages/db/package.json` (add `prisma.seed` field)

- [ ] **Step 1: Check package.json structure**

```bash
cat /Users/carlospenaranda/Proggetto_finanza_agevolata/packages/db/package.json
```

Confirm script `"prisma:seed": "tsx prisma/seed.ts"` exists and `tsx` is in devDependencies.

- [ ] **Step 2: Create seed.ts**

```typescript
// packages/db/prisma/seed.ts
import { PrismaClient, DocumentCategory } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedDoc {
  slug: string;
  name: string;
  description: string;
  category: DocumentCategory;
  validityDays: number | null;
}

const STANDARD_DOCS: SeedDoc[] = [
  { slug: "visura-camerale", name: "Visura Camerale", description: "Certificato CCIAA con dati legali dell'impresa", category: "LEGAL", validityDays: 180 },
  { slug: "durc", name: "DURC", description: "Documento Unico Regolarità Contributiva (INPS/INAIL)", category: "LEGAL", validityDays: 120 },
  { slug: "dsan", name: "DSAN", description: "Dichiarazione Sostitutiva di Atto Notorio", category: "LEGAL", validityDays: null },
  { slug: "bilanci", name: "Bilanci", description: "Ultimi 2-3 esercizi depositati in CCIAA", category: "FINANCIAL", validityDays: null },
  { slug: "business-plan", name: "Business Plan", description: "Piano d'impresa con proiezioni finanziarie", category: "PROJECT", validityDays: null },
  { slug: "de-minimis", name: "Dichiarazione de minimis", description: "Attesta aiuti di stato ricevuti negli ultimi 3 anni (Reg. UE 2023/2831)", category: "FISCAL", validityDays: null },
  { slug: "preventivi", name: "Preventivi fornitori", description: "Almeno 2-3 preventivi comparativi per voce di spesa, firmati", category: "PROJECT", validityDays: null },
  { slug: "antimafia", name: "Dichiarazione Antimafia", description: "Certificato Prefettura per contributi > 150.000 EUR", category: "LEGAL", validityDays: null },
  { slug: "antiriciclaggio", name: "Dichiarazione Antiriciclaggio", description: "Identifica titolari effettivi (>25% capitale)", category: "LEGAL", validityDays: null },
  { slug: "contabilita-separata", name: "Contabilità Separata", description: "Impegno a codifica separata spese progetto", category: "FINANCIAL", validityDays: null },
  { slug: "doc-identita", name: "Documento d'identità", description: "Legale rappresentante, in corso di validità", category: "LEGAL", validityDays: null },
  { slug: "firma-digitale", name: "Firma digitale", description: "Del legale rappresentante, necessaria per invio telematico", category: "CERTIFICATION", validityDays: null },
  { slug: "codice-ateco", name: "Codice ATECO", description: "Classificazione attività economica nel settore ammesso", category: "LEGAL", validityDays: null },
  { slug: "dichiarazioni-fiscali", name: "Dichiarazioni fiscali", description: "Ultime dichiarazioni dei redditi (regolarità fiscale)", category: "FISCAL", validityDays: null },
  { slug: "certificazioni", name: "Certificazioni specifiche", description: "ISO, SOA, ambientali (dipendono dal bando)", category: "CERTIFICATION", validityDays: null },
];

async function main() {
  console.log(`Seeding ${STANDARD_DOCS.length} standard DocumentType entries...`);
  for (const doc of STANDARD_DOCS) {
    await prisma.documentType.upsert({
      where: { slug: doc.slug },
      update: {},
      create: {
        slug: doc.slug,
        name: doc.name,
        description: doc.description,
        category: doc.category,
        validityDays: doc.validityDays,
        acceptedFormats: ["pdf"],
        maxSizeMb: 10,
        isStandard: true,
      },
    });
    console.log(`  ✓ ${doc.slug}`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Add prisma.seed field to package.json**

Edit `packages/db/package.json` — add top-level `"prisma"` field after `"types"`:

```json
{
  "name": "@finagevolata/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:push": "prisma db push",
    "prisma:seed": "tsx prisma/seed.ts",
    "prisma:studio": "prisma studio"
  }
}
```

- [ ] **Step 4: Run seed**

```bash
cd /Users/carlospenaranda/Proggetto_finanza_agevolata
pnpm --filter @finagevolata/db prisma:seed
```

Expected: 15 lines "✓ <slug>" then "Seed complete."

- [ ] **Step 5: Verify in DB**

```bash
cd /Users/carlospenaranda/Proggetto_finanza_agevolata/packages/db
echo 'SELECT count(*) FROM document_types WHERE "isStandard" = true;' | pnpm prisma db execute --stdin --url "$DATABASE_URL" 2>/dev/null || echo "Skip DB check — run Prisma Studio manually."
```

Expected: count returns 15 (or Studio shows 15 rows).

- [ ] **Step 6: Re-run seed to verify idempotency**

```bash
pnpm --filter @finagevolata/db prisma:seed
```

Expected: 15 more "✓" lines (upserts, no errors).

- [ ] **Step 7: Commit**

```bash
git add packages/db/prisma/seed.ts packages/db/package.json
git commit -m "feat(db): seed 15 standard DocumentType entries

Adds idempotent seed script covering the 15 standard Italian grant
documents (Visura, DURC, DSAN, Bilanci, Business Plan, de minimis,
Preventivi, Antimafia, Antiriciclaggio, Contabilità Separata, Doc
identità, Firma digitale, Codice ATECO, Dichiarazioni fiscali,
Certificazioni specifiche). All rows marked isStandard: true and
protected from deletion by the admin action layer.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Shared Schemas — Grant Refinements + DocumentType

**Files:**
- Modify: `packages/shared/src/schemas/grant.ts`
- Create: `packages/shared/src/schemas/grant.test.ts`
- Create: `packages/shared/src/schemas/document-type.ts`
- Create: `packages/shared/src/schemas/document-type.test.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 1: Write failing test for grant refinements**

Create `packages/shared/src/schemas/grant.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { grantCreateSchema, grantUpdateSchema } from "./grant";

const baseValid = {
  title: "Bando Digitalizzazione PMI",
  description: "Bando per la digitalizzazione delle piccole e medie imprese italiane",
  issuingBody: "MISE",
  grantType: "FONDO_PERDUTO" as const,
  hasClickDay: false,
  eligibleAtecoCodes: [],
  eligibleRegions: [],
  eligibleCompanySizes: [],
  documentRequirements: [],
};

describe("grantCreateSchema", () => {
  it("parses a valid minimal payload", () => {
    const result = grantCreateSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 5 chars", () => {
    const result = grantCreateSchema.safeParse({ ...baseValid, title: "BM" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/titolo/i);
  });

  it("rejects hasClickDay=true without clickDayDate", () => {
    const result = grantCreateSchema.safeParse({ ...baseValid, hasClickDay: true });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/click day/i);
  });

  it("accepts hasClickDay=true with clickDayDate", () => {
    const result = grantCreateSchema.safeParse({
      ...baseValid,
      hasClickDay: true,
      clickDayDate: "2026-06-01T09:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects minAmount > maxAmount", () => {
    const result = grantCreateSchema.safeParse({ ...baseValid, minAmount: 1000, maxAmount: 500 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(/min.*max/i);
  });

  it("accepts minAmount <= maxAmount", () => {
    const result = grantCreateSchema.safeParse({ ...baseValid, minAmount: 500, maxAmount: 1000 });
    expect(result.success).toBe(true);
  });
});

describe("grantUpdateSchema", () => {
  it("allows partial updates", () => {
    const result = grantUpdateSchema.safeParse({ title: "New title very long" });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @finagevolata/shared test -- grant
```

Expected: FAIL — `grantUpdateSchema` not exported + missing refinements.

- [ ] **Step 3: Modify grant.ts with refinements + update schema**

Replace the whole content of `packages/shared/src/schemas/grant.ts`:

```typescript
import { z } from "zod";

export const grantTypeEnum = z.enum([
  "FONDO_PERDUTO",
  "FINANZIAMENTO_AGEVOLATO",
  "CREDITO_IMPOSTA",
  "GARANZIA",
]);

export const grantStatusEnum = z.enum(["DRAFT", "PUBLISHED", "CLOSED", "EXPIRED"]);

export const companySizeEnum = z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]);

export const grantDocRequirementInput = z.object({
  documentTypeId: z.string().min(1),
  isRequired: z.boolean().default(true),
  notes: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
});

const grantBase = z.object({
  title: z.string().min(5, "Titolo troppo corto").max(200),
  description: z.string().min(20, "Descrizione troppo corta").max(5000),
  issuingBody: z.string().min(2, "Ente emittente richiesto").max(200),
  grantType: grantTypeEnum,
  minAmount: z.number().nonnegative().nullable().optional(),
  maxAmount: z.number().nonnegative().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  openDate: z.string().datetime().nullable().optional(),
  hasClickDay: z.boolean().default(false),
  clickDayDate: z.string().datetime().nullable().optional(),
  eligibleAtecoCodes: z.array(z.string()).default([]),
  eligibleRegions: z.array(z.string()).default([]),
  eligibleCompanySizes: z.array(companySizeEnum).default([]),
  sourceUrl: z.string().url().nullable().optional().or(z.literal("")),
  documentRequirements: z.array(grantDocRequirementInput).default([]),
});

export const grantCreateSchema = grantBase
  .refine((d) => !d.hasClickDay || !!d.clickDayDate, {
    message: "Click Day abilitato richiede data",
    path: ["clickDayDate"],
  })
  .refine(
    (d) =>
      d.minAmount == null ||
      d.maxAmount == null ||
      d.minAmount <= d.maxAmount,
    {
      message: "Min amount deve essere minore o uguale al max",
      path: ["minAmount"],
    },
  );

export const grantUpdateSchema = grantBase.partial();

export const grantMatchFilters = z.object({
  atecoCode: z.string().optional(),
  region: z.string().optional(),
  companySize: companySizeEnum.optional(),
});

export type GrantCreateInput = z.infer<typeof grantCreateSchema>;
export type GrantUpdateInput = z.infer<typeof grantUpdateSchema>;
export type GrantDocRequirementInput = z.infer<typeof grantDocRequirementInput>;
export type GrantMatchFilters = z.infer<typeof grantMatchFilters>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @finagevolata/shared test -- grant
```

Expected: PASS (7 tests).

- [ ] **Step 5: Write failing test for DocumentType schema**

Create `packages/shared/src/schemas/document-type.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { documentTypeCreateSchema, documentTypeUpdateSchema } from "./document-type";

const baseValid = {
  slug: "test-doc",
  name: "Test Doc",
  description: "A test document type for validation",
  category: "LEGAL" as const,
  validityDays: null,
  acceptedFormats: ["pdf"],
  maxSizeMb: 10,
};

describe("documentTypeCreateSchema", () => {
  it("parses valid payload", () => {
    const result = documentTypeCreateSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("rejects slug with spaces or uppercase", () => {
    const bad = documentTypeCreateSchema.safeParse({ ...baseValid, slug: "Test Doc" });
    expect(bad.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const bad = documentTypeCreateSchema.safeParse({ ...baseValid, category: "FOO" });
    expect(bad.success).toBe(false);
  });

  it("accepts validityDays null and positive", () => {
    expect(documentTypeCreateSchema.safeParse({ ...baseValid, validityDays: 30 }).success).toBe(true);
    expect(documentTypeCreateSchema.safeParse({ ...baseValid, validityDays: null }).success).toBe(true);
  });

  it("rejects validityDays negative", () => {
    const bad = documentTypeCreateSchema.safeParse({ ...baseValid, validityDays: -1 });
    expect(bad.success).toBe(false);
  });
});

describe("documentTypeUpdateSchema", () => {
  it("accepts partial update", () => {
    expect(documentTypeUpdateSchema.safeParse({ name: "Updated" }).success).toBe(true);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm --filter @finagevolata/shared test -- document-type
```

Expected: FAIL — module not found.

- [ ] **Step 7: Create document-type.ts**

```typescript
// packages/shared/src/schemas/document-type.ts
import { z } from "zod";

export const documentCategoryEnum = z.enum([
  "LEGAL",
  "FINANCIAL",
  "FISCAL",
  "PROJECT",
  "CERTIFICATION",
]);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const documentTypeBase = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(slugRegex, "Slug invalido (lowercase, trattini)"),
  name: z.string().min(2).max(120),
  description: z.string().min(5).max(1000),
  category: documentCategoryEnum,
  validityDays: z.number().int().positive().nullable().optional(),
  acceptedFormats: z.array(z.string()).default(["pdf"]),
  maxSizeMb: z.number().int().positive().max(100).default(10),
});

export const documentTypeCreateSchema = documentTypeBase;
export const documentTypeUpdateSchema = documentTypeBase.partial();

export type DocumentTypeCreateInput = z.infer<typeof documentTypeCreateSchema>;
export type DocumentTypeUpdateInput = z.infer<typeof documentTypeUpdateSchema>;
```

- [ ] **Step 8: Append export to schemas index**

Edit `packages/shared/src/schemas/index.ts`. Append one line:

```typescript
export * from "./document-type";
```

Final file:

```typescript
export * from "./auth";
export * from "./grant";
export * from "./practice";
export * from "./company";
export * from "./invite";
export * from "./document-type";
```

- [ ] **Step 9: Run tests to verify pass**

```bash
pnpm --filter @finagevolata/shared test
```

Expected: all shared tests pass (prior + 7 grant + 6 document-type).

- [ ] **Step 10: Commit**

```bash
git add packages/shared/src/schemas/grant.ts packages/shared/src/schemas/grant.test.ts packages/shared/src/schemas/document-type.ts packages/shared/src/schemas/document-type.test.ts packages/shared/src/schemas/index.ts
git commit -m "feat(shared): enhance Grant schema, add DocumentType schema

Grant: extracts reusable enums (grantTypeEnum, grantStatusEnum,
companySizeEnum), tightens bounds (title 5-200, description 20-5000),
adds cross-field refinements (hasClickDay requires clickDayDate; min
amount must not exceed max). Adds grantUpdateSchema partial variant
and GrantUpdateInput type.

DocumentType: new Zod schema covering slug (lowercase-kebab),
name, description, category, validityDays, acceptedFormats, maxSizeMb,
with matching partial update schema.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Email Functions for Grant Workflow

**Files:**
- Modify: `apps/web/lib/email.ts`

- [ ] **Step 1: Append sendGrantSubmittedEmail + sendGrantRejectedEmail**

Append to `apps/web/lib/email.ts`:

```typescript
/**
 * Notifica tutti gli ADMIN_EMAILS che un consulente ha proposto un nuovo bando
 */
export async function sendGrantSubmittedEmail({
  consultantName,
  grantTitle,
}: {
  consultantName: string;
  grantTitle: string;
}) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    console.warn("sendGrantSubmittedEmail: ADMIN_EMAILS non configurato, skip.");
    return { success: false, error: "No ADMIN_EMAILS" };
  }
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://axentraitalia.cloud";
  const text = `${consultantName} ha proposto un nuovo bando: "${grantTitle}".

Vai alla coda approvazioni: ${baseUrl}/admin/bandi/queue
`;
  return sendEmail({
    to: adminEmails.join(","),
    subject: `[FinAgevolata] Nuovo bando da approvare: ${grantTitle}`,
    text,
  });
}

/**
 * Notifica il consulente che il bando proposto è stato rifiutato
 */
export async function sendGrantRejectedEmail({
  to,
  consultantName,
  grantTitle,
  reason,
}: {
  to: string;
  consultantName: string;
  grantTitle: string;
  reason: string;
}) {
  const text = `Ciao ${consultantName},

Il bando che hai proposto — "${grantTitle}" — non è stato approvato per il seguente motivo:

"${reason}"

Puoi riproporlo con le modifiche necessarie.
`;
  return sendEmail({
    to,
    subject: `Bando "${grantTitle}" non approvato`,
    text,
  });
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/carlospenaranda/Proggetto_finanza_agevolata
pnpm --filter web build
```

Expected: build succeeds (no type errors from new functions).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/email.ts
git commit -m "feat(email): add grant-submitted + grant-rejected transactional emails

sendGrantSubmittedEmail fans out to all ADMIN_EMAILS when a consultant
proposes a bando, linking to the approval queue. Safe no-op when no
admin emails configured.

sendGrantRejectedEmail notifies the original consultant when their
submission is rejected, including the admin-provided reason and
inviting resubmission.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Server Actions for DocumentType CRUD

**Files:**
- Create: `apps/web/lib/actions/document-types.ts`
- Create: `apps/web/lib/actions/document-types.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/lib/actions/document-types.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentType: {
      findUnique: (...a: any[]) => mockFindUnique(...a),
      create: (...a: any[]) => mockCreate(...a),
      update: (...a: any[]) => mockUpdate(...a),
      delete: (...a: any[]) => mockDelete(...a),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from "./document-types";

const valid = {
  slug: "custom-doc",
  name: "Custom Doc",
  description: "A custom document type",
  category: "LEGAL" as const,
  validityDays: null,
  acceptedFormats: ["pdf"],
  maxSizeMb: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createDocumentType", () => {
  it("throws when role is not ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "CONSULTANT" } });
    await expect(createDocumentType(valid)).rejects.toThrow(/non autorizzato|accesso negato/i);
  });

  it("creates when ADMIN with valid input", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockCreate.mockResolvedValue({ id: "dt1", ...valid, isStandard: false });
    const result = await createDocumentType(valid);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: valid.slug, isStandard: false }),
    });
    expect(result.id).toBe("dt1");
  });

  it("rejects invalid Zod payload", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    await expect(createDocumentType({ ...valid, slug: "Bad Slug" })).rejects.toThrow();
  });
});

describe("updateDocumentType", () => {
  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    await expect(updateDocumentType("dt1", { name: "x" })).rejects.toThrow();
  });

  it("updates when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockUpdate.mockResolvedValue({ id: "dt1", ...valid, name: "Updated" });
    await updateDocumentType("dt1", { name: "Updated" });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "dt1" },
      data: expect.objectContaining({ name: "Updated" }),
    });
  });
});

describe("deleteDocumentType", () => {
  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "CONSULTANT" } });
    await expect(deleteDocumentType("dt1")).rejects.toThrow();
  });

  it("blocks delete of isStandard document", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "dt1", isStandard: true });
    await expect(deleteDocumentType("dt1")).rejects.toThrow(/standard/i);
  });

  it("deletes non-standard when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockFindUnique.mockResolvedValue({ id: "dt1", isStandard: false });
    mockDelete.mockResolvedValue({ id: "dt1" });
    await deleteDocumentType("dt1");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "dt1" } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- document-types
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create document-types.ts server action file**

```typescript
// apps/web/lib/actions/document-types.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  documentTypeCreateSchema,
  documentTypeUpdateSchema,
  type DocumentTypeCreateInput,
  type DocumentTypeUpdateInput,
} from "@finagevolata/shared";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) throw new Error("Non autorizzato");
  if (user.role !== "ADMIN") throw new Error("Accesso negato");
  return { userId: user.id };
}

export async function createDocumentType(input: DocumentTypeCreateInput) {
  await requireAdmin();
  const data = documentTypeCreateSchema.parse(input);
  const created = await prisma.documentType.create({
    data: { ...data, isStandard: false },
  });
  revalidatePath("/admin/documenti");
  return created;
}

export async function updateDocumentType(id: string, input: DocumentTypeUpdateInput) {
  await requireAdmin();
  const data = documentTypeUpdateSchema.parse(input);
  const updated = await prisma.documentType.update({ where: { id }, data });
  revalidatePath("/admin/documenti");
  revalidatePath(`/admin/documenti/${id}`);
  return updated;
}

export async function deleteDocumentType(id: string) {
  await requireAdmin();
  const existing = await prisma.documentType.findUnique({ where: { id } });
  if (!existing) throw new Error("DocumentType non trovato");
  if (existing.isStandard) throw new Error("Impossibile eliminare un DocumentType standard");
  await prisma.documentType.delete({ where: { id } });
  revalidatePath("/admin/documenti");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test -- document-types
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/document-types.ts apps/web/lib/actions/document-types.test.ts
git commit -m "feat(admin): server actions for DocumentType CRUD

Adds ADMIN-gated server actions: createDocumentType, updateDocumentType,
deleteDocumentType. All actions validate input via shared Zod schemas
and call revalidatePath for cache invalidation. Deletion is blocked
when isStandard=true so seeded documents remain protected.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Server Actions for Grant CRUD + Approval Workflow

**Files:**
- Create: `apps/web/lib/actions/grants.ts`
- Create: `apps/web/lib/actions/grants.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/lib/actions/grants.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockGrantFindUnique = vi.fn();
const mockGrantCreate = vi.fn();
const mockGrantUpdate = vi.fn();
const mockGrantDelete = vi.fn();
const mockDocReqDeleteMany = vi.fn();
const mockDocReqCreateMany = vi.fn();
const mockTransaction = vi.fn();
const mockSendSubmitted = vi.fn();
const mockSendRejected = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    grant: {
      findUnique: (...a: any[]) => mockGrantFindUnique(...a),
      create: (...a: any[]) => mockGrantCreate(...a),
      update: (...a: any[]) => mockGrantUpdate(...a),
      delete: (...a: any[]) => mockGrantDelete(...a),
    },
    grantDocumentRequirement: {
      deleteMany: (...a: any[]) => mockDocReqDeleteMany(...a),
      createMany: (...a: any[]) => mockDocReqCreateMany(...a),
    },
    $transaction: (fn: any) => mockTransaction(fn),
  },
}));
vi.mock("@/lib/email", () => ({
  sendGrantSubmittedEmail: (...a: any[]) => mockSendSubmitted(...a),
  sendGrantRejectedEmail: (...a: any[]) => mockSendRejected(...a),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createGrant,
  updateGrant,
  approveGrant,
  rejectGrant,
  publishGrant,
  closeGrant,
  deleteGrant,
} from "./grants";

const validInput = {
  title: "Bando Digitalizzazione PMI 2026",
  description: "Bando per la digitalizzazione delle piccole e medie imprese italiane con fondi PNRR",
  issuingBody: "MISE",
  grantType: "FONDO_PERDUTO" as const,
  hasClickDay: false,
  eligibleAtecoCodes: [],
  eligibleRegions: [],
  eligibleCompanySizes: [],
  documentRequirements: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSendSubmitted.mockResolvedValue({ success: true });
  mockSendRejected.mockResolvedValue({ success: true });
});

describe("createGrant", () => {
  it("throws when no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(createGrant(validInput)).rejects.toThrow(/non autorizzato/i);
  });

  it("throws when role is COMPANY", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    await expect(createGrant(validInput)).rejects.toThrow(/accesso negato/i);
  });

  it("creates as ADMIN with approvedByAdmin=true and no submission email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN", name: "A" } });
    mockGrantCreate.mockResolvedValue({ id: "g1" });
    await createGrant(validInput);
    expect(mockGrantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: "admin1",
        status: "DRAFT",
        approvedByAdmin: true,
      }),
    });
    expect(mockSendSubmitted).not.toHaveBeenCalled();
  });

  it("creates as CONSULTANT with approvedByAdmin=false and sends submission email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT", name: "Mario" } });
    mockGrantCreate.mockResolvedValue({ id: "g2" });
    await createGrant(validInput);
    expect(mockGrantCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        createdById: "c1",
        status: "DRAFT",
        approvedByAdmin: false,
      }),
    });
    expect(mockSendSubmitted).toHaveBeenCalledWith({
      consultantName: "Mario",
      grantTitle: validInput.title,
    });
  });

  it("rejects short title via Zod", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    await expect(createGrant({ ...validInput, title: "No" })).rejects.toThrow();
  });

  it("rejects hasClickDay without clickDayDate", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    await expect(createGrant({ ...validInput, hasClickDay: true })).rejects.toThrow();
  });
});

describe("updateGrant", () => {
  it("blocks CONSULTANT editing bando altrui", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    mockGrantFindUnique.mockResolvedValue({ id: "g1", createdById: "other", approvedByAdmin: false });
    await expect(updateGrant("g1", { title: "New title long enough" })).rejects.toThrow(/altrui/i);
  });

  it("blocks CONSULTANT editing own already-approved grant", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    mockGrantFindUnique.mockResolvedValue({ id: "g1", createdById: "c1", approvedByAdmin: true });
    await expect(updateGrant("g1", { title: "New title long enough" })).rejects.toThrow(/approvato/i);
  });

  it("allows ADMIN to update any grant", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantFindUnique.mockResolvedValue({ id: "g1", createdById: "c1", approvedByAdmin: true });
    mockTransaction.mockImplementation(async (fn) => {
      await fn({
        grant: { update: mockGrantUpdate },
        grantDocumentRequirement: {
          deleteMany: mockDocReqDeleteMany,
          createMany: mockDocReqCreateMany,
        },
      });
    });
    await updateGrant("g1", { title: "Updated very long title" });
    expect(mockTransaction).toHaveBeenCalled();
  });
});

describe("approveGrant", () => {
  it("sets approvedByAdmin true when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantUpdate.mockResolvedValue({ id: "g1", approvedByAdmin: true });
    await approveGrant("g1");
    expect(mockGrantUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { approvedByAdmin: true },
    });
  });

  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    await expect(approveGrant("g1")).rejects.toThrow();
  });
});

describe("rejectGrant", () => {
  it("deletes grant and sends rejection email", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantFindUnique.mockResolvedValue({
      id: "g1",
      title: "Test Grant",
      createdBy: { email: "c@x.com", name: "Consulente" },
    });
    await rejectGrant("g1", "Manca la descrizione completa");
    expect(mockGrantDelete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(mockSendRejected).toHaveBeenCalledWith({
      to: "c@x.com",
      consultantName: "Consulente",
      grantTitle: "Test Grant",
      reason: "Manca la descrizione completa",
    });
  });
});

describe("publishGrant", () => {
  it("sets status PUBLISHED and approvedByAdmin true", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantUpdate.mockResolvedValue({ id: "g1" });
    await publishGrant("g1");
    expect(mockGrantUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { status: "PUBLISHED", approvedByAdmin: true },
    });
  });
});

describe("closeGrant", () => {
  it("sets status CLOSED", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantUpdate.mockResolvedValue({ id: "g1" });
    await closeGrant("g1");
    expect(mockGrantUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { status: "CLOSED" },
    });
  });
});

describe("deleteGrant", () => {
  it("deletes grant when ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    mockGrantDelete.mockResolvedValue({ id: "g1" });
    await deleteGrant("g1");
    expect(mockGrantDelete).toHaveBeenCalledWith({ where: { id: "g1" } });
  });

  it("blocks non-ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    await expect(deleteGrant("g1")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- grants
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create grants.ts server action file**

```typescript
// apps/web/lib/actions/grants.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  grantCreateSchema,
  grantUpdateSchema,
  type GrantCreateInput,
  type GrantUpdateInput,
} from "@finagevolata/shared";
import {
  sendGrantSubmittedEmail,
  sendGrantRejectedEmail,
} from "@/lib/email";

type Role = "ADMIN" | "CONSULTANT" | "COMPANY";

async function requireSession(allowed: Role[]) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: Role; name?: string } | undefined;
  if (!user?.id) throw new Error("Non autorizzato");
  if (!allowed.includes(user.role as Role)) throw new Error("Accesso negato");
  return { userId: user.id, role: user.role as Role, name: user.name };
}

function normalizeGrantData(parsed: GrantCreateInput | GrantUpdateInput) {
  const { documentRequirements, sourceUrl, deadline, openDate, clickDayDate, ...rest } =
    parsed as GrantCreateInput;
  return {
    data: {
      ...rest,
      deadline: deadline ? new Date(deadline) : null,
      openDate: openDate ? new Date(openDate) : null,
      clickDayDate: clickDayDate ? new Date(clickDayDate) : null,
      sourceUrl: sourceUrl === "" ? null : sourceUrl ?? null,
    },
    documentRequirements,
  };
}

export async function createGrant(input: GrantCreateInput) {
  const { userId, role, name } = await requireSession(["ADMIN", "CONSULTANT"]);
  const parsed = grantCreateSchema.parse(input);
  const { data, documentRequirements } = normalizeGrantData(parsed);

  const grant = await prisma.grant.create({
    data: {
      ...data,
      createdById: userId,
      status: "DRAFT",
      approvedByAdmin: role === "ADMIN",
      documentRequirements: {
        create: (documentRequirements ?? []).map((d) => ({
          documentTypeId: d.documentTypeId,
          isRequired: d.isRequired ?? true,
          notes: d.notes ?? null,
          order: d.order ?? 0,
        })),
      },
    },
  });

  if (role === "CONSULTANT") {
    sendGrantSubmittedEmail({
      consultantName: name ?? "Un consulente",
      grantTitle: grant.title,
    }).catch((err) => console.error("Grant submission email failed:", err));
  }

  revalidatePath("/admin/bandi");
  revalidatePath("/admin/bandi/queue");
  if (role === "CONSULTANT") revalidatePath("/consulente/bandi");
  return grant;
}

export async function updateGrant(id: string, input: GrantUpdateInput) {
  const { userId, role } = await requireSession(["ADMIN", "CONSULTANT"]);
  const existing = await prisma.grant.findUnique({ where: { id } });
  if (!existing) throw new Error("Bando non trovato");

  if (role === "CONSULTANT") {
    if (existing.createdById !== userId) {
      throw new Error("Non puoi modificare un bando altrui");
    }
    if (existing.approvedByAdmin) {
      throw new Error("Bando già approvato, non modificabile");
    }
  }

  const parsed = grantUpdateSchema.parse(input);
  const { data, documentRequirements } = normalizeGrantData(parsed);

  await prisma.$transaction(async (tx) => {
    await tx.grant.update({ where: { id }, data });
    if (documentRequirements !== undefined) {
      await tx.grantDocumentRequirement.deleteMany({ where: { grantId: id } });
      if (documentRequirements.length > 0) {
        await tx.grantDocumentRequirement.createMany({
          data: documentRequirements.map((d) => ({
            grantId: id,
            documentTypeId: d.documentTypeId,
            isRequired: d.isRequired ?? true,
            notes: d.notes ?? null,
            order: d.order ?? 0,
          })),
        });
      }
    }
  });

  revalidatePath(`/admin/bandi/${id}`);
  revalidatePath("/admin/bandi");
  if (role === "CONSULTANT") revalidatePath(`/consulente/bandi/${id}`);
}

export async function deleteGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.delete({ where: { id } });
  revalidatePath("/admin/bandi");
}

export async function approveGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.update({
    where: { id },
    data: { approvedByAdmin: true },
  });
  revalidatePath("/admin/bandi");
  revalidatePath("/admin/bandi/queue");
  revalidatePath(`/admin/bandi/${id}`);
}

export async function rejectGrant(id: string, reason: string) {
  await requireSession(["ADMIN"]);
  if (!reason || reason.trim().length < 3) {
    throw new Error("Motivo rifiuto troppo corto");
  }
  const grant = await prisma.grant.findUnique({
    where: { id },
    include: { createdBy: { select: { email: true, name: true } } },
  });
  if (!grant) throw new Error("Bando non trovato");

  await prisma.grant.delete({ where: { id } });

  sendGrantRejectedEmail({
    to: grant.createdBy.email,
    consultantName: grant.createdBy.name ?? "Consulente",
    grantTitle: grant.title,
    reason,
  }).catch((err) => console.error("Reject email failed:", err));

  revalidatePath("/admin/bandi/queue");
  revalidatePath("/admin/bandi");
}

export async function publishGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.update({
    where: { id },
    data: { status: "PUBLISHED", approvedByAdmin: true },
  });
  revalidatePath(`/admin/bandi/${id}`);
  revalidatePath("/admin/bandi");
  revalidatePath("/azienda/bandi");
  revalidatePath("/consulente/bandi");
}

export async function closeGrant(id: string) {
  await requireSession(["ADMIN"]);
  await prisma.grant.update({
    where: { id },
    data: { status: "CLOSED" },
  });
  revalidatePath(`/admin/bandi/${id}`);
  revalidatePath("/admin/bandi");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter web test -- grants
```

Expected: PASS (~14 tests).

- [ ] **Step 5: Run full web test suite**

```bash
pnpm --filter web test
```

Expected: all existing + new tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/actions/grants.ts apps/web/lib/actions/grants.test.ts
git commit -m "feat(admin): server actions for Grant CRUD + approval workflow

Adds: createGrant, updateGrant, deleteGrant, approveGrant, rejectGrant,
publishGrant, closeGrant. All role-gated via requireSession. ADMIN
writes auto-approve; CONSULTANT writes set approvedByAdmin:false and
fire a non-blocking notification email to ADMIN_EMAILS. Update uses
prisma.\$transaction to swap GrantDocumentRequirement rows atomically.
Reject deletes the grant and emails the original consultant with the
admin-provided reason.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Admin Layout + Overview + Sidebar

**Files:**
- Modify: `apps/web/app/(dashboard)/admin/layout.tsx` (create if missing)
- Modify: `apps/web/app/(dashboard)/admin/page.tsx`
- Create: `apps/web/components/admin/admin-sidebar.tsx`

- [ ] **Step 1: Check existing admin layout**

```bash
ls apps/web/app/\(dashboard\)/admin/
```

Note whether `layout.tsx` exists. If yes, read it first; if no, create new.

- [ ] **Step 2: Create admin-sidebar.tsx**

```typescript
// apps/web/components/admin/admin-sidebar.tsx
import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bandi", label: "Bandi" },
  { href: "/admin/bandi/queue", label: "Coda approvazioni" },
  { href: "/admin/documenti", label: "Documenti" },
];

export function AdminSidebar() {
  return (
    <aside className="w-56 border-r border-slate-200 bg-white p-4">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Admin
        </p>
      </div>
      <nav className="space-y-1">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create or modify admin/layout.tsx**

Write `apps/web/app/(dashboard)/admin/layout.tsx`:

```typescript
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Overwrite admin/page.tsx with overview cards**

```typescript
// apps/web/app/(dashboard)/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
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
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard Admin</h1>
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
    </div>
  );
}
```

- [ ] **Step 5: Run build**

```bash
pnpm --filter web build
```

Expected: build succeeds, `/admin` appears in output route list.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/admin/admin-sidebar.tsx apps/web/app/\(dashboard\)/admin/layout.tsx apps/web/app/\(dashboard\)/admin/page.tsx
git commit -m "feat(admin): overview page with sidebar navigation

Adds admin-wide layout with left sidebar (Overview, Bandi, Coda
approvazioni, Documenti) and refreshes /admin to show three live
counter cards linking to each section.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Admin DocumentType UI (List + New + Edit)

**Files:**
- Create: `apps/web/components/documenti/doc-type-form.tsx`
- Create: `apps/web/app/(dashboard)/admin/documenti/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/documenti/[id]/page.tsx`

- [ ] **Step 1: Create doc-type-form.tsx client component**

```typescript
// apps/web/components/documenti/doc-type-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentTypeCreateInput } from "@finagevolata/shared";

const CATEGORIES = [
  { value: "LEGAL", label: "Legale" },
  { value: "FINANCIAL", label: "Finanziario" },
  { value: "FISCAL", label: "Fiscale" },
  { value: "PROJECT", label: "Progetto" },
  { value: "CERTIFICATION", label: "Certificazione" },
] as const;

interface Props {
  initial?: Partial<DocumentTypeCreateInput>;
  onSubmit: (data: DocumentTypeCreateInput) => Promise<unknown>;
  submitLabel: string;
  isStandard?: boolean;
}

export function DocTypeForm({ initial, onSubmit, submitLabel, isStandard }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: DocumentTypeCreateInput = {
      slug: String(fd.get("slug") ?? ""),
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? ""),
      category: fd.get("category") as DocumentTypeCreateInput["category"],
      validityDays: fd.get("validityDays") ? Number(fd.get("validityDays")) : null,
      acceptedFormats: String(fd.get("acceptedFormats") ?? "pdf").split(",").map((s) => s.trim()).filter(Boolean),
      maxSizeMb: Number(fd.get("maxSizeMb") ?? 10),
    };
    startTransition(async () => {
      try {
        await onSubmit(data);
        router.push("/admin/documenti");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      {isStandard ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Documento standard — non eliminabile.
        </p>
      ) : null}
      <Field label="Slug (url-friendly)">
        <input name="slug" defaultValue={initial?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} />
      </Field>
      <Field label="Nome">
        <input name="name" defaultValue={initial?.name} required minLength={2} className={input} />
      </Field>
      <Field label="Descrizione">
        <textarea name="description" defaultValue={initial?.description} required minLength={5} rows={3} className={input} />
      </Field>
      <Field label="Categoria">
        <select name="category" defaultValue={initial?.category ?? "LEGAL"} required className={input}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Validità (giorni) — opzionale">
        <input name="validityDays" type="number" min={1} defaultValue={initial?.validityDays ?? ""} className={input} />
      </Field>
      <Field label="Formati accettati (CSV)">
        <input name="acceptedFormats" defaultValue={(initial?.acceptedFormats ?? ["pdf"]).join(",")} className={input} />
      </Field>
      <Field label="Max size MB">
        <input name="maxSizeMb" type="number" min={1} max={100} defaultValue={initial?.maxSizeMb ?? 10} className={input} />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
        {pending ? "Salvataggio…" : submitLabel}
      </button>
    </form>
  );
}

const input = "block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
```

- [ ] **Step 2: Create documenti list page**

```typescript
// apps/web/app/(dashboard)/admin/documenti/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DocTypeForm } from "@/components/documenti/doc-type-form";
import { createDocumentType } from "@/lib/actions/document-types";

export default async function DocumentiPage() {
  const items = await prisma.documentType.findMany({
    orderBy: [{ isStandard: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tipi di documento</h1>
      </div>
      <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="p-3">Nome</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Categoria</th>
              <th className="p-3">Validità</th>
              <th className="p-3">Standard</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-t border-slate-200 text-sm">
                <td className="p-3 font-medium text-slate-900">{d.name}</td>
                <td className="p-3 font-mono text-xs text-slate-600">{d.slug}</td>
                <td className="p-3">{d.category}</td>
                <td className="p-3">{d.validityDays ? `${d.validityDays} gg` : "—"}</td>
                <td className="p-3">{d.isStandard ? "Sì" : "No"}</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/documenti/${d.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                    Modifica
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Aggiungi tipo documento</h2>
      <DocTypeForm onSubmit={createDocumentType} submitLabel="Crea" />
    </div>
  );
}
```

- [ ] **Step 3: Create documenti edit page**

```typescript
// apps/web/app/(dashboard)/admin/documenti/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DocTypeForm } from "@/components/documenti/doc-type-form";
import { updateDocumentType, deleteDocumentType } from "@/lib/actions/document-types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentoEditPage({ params }: PageProps) {
  const { id } = await params;
  const doc = await prisma.documentType.findUnique({ where: { id } });
  if (!doc) notFound();

  async function updateAction(data: Parameters<typeof updateDocumentType>[1]) {
    "use server";
    await updateDocumentType(id, data);
  }

  async function deleteAction() {
    "use server";
    await deleteDocumentType(id);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Modifica documento</h1>
      <DocTypeForm
        initial={{
          slug: doc.slug,
          name: doc.name,
          description: doc.description,
          category: doc.category,
          validityDays: doc.validityDays,
          acceptedFormats: doc.acceptedFormats,
          maxSizeMb: doc.maxSizeMb,
        }}
        onSubmit={updateAction}
        submitLabel="Salva"
        isStandard={doc.isStandard}
      />
      {!doc.isStandard ? (
        <form action={deleteAction} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Elimina
          </button>
        </form>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Build + manual smoke**

```bash
pnpm --filter web build
```

Expected: build clean, `/admin/documenti` + `/admin/documenti/[id]` in route list.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/documenti apps/web/app/\(dashboard\)/admin/documenti
git commit -m "feat(admin): DocumentType list, create, edit pages

Table lists all DocumentTypes sorted with standard docs first. Bottom
of the page hosts an inline create form via DocTypeForm. Edit page
reuses the same form, shows a warning banner when isStandard:true and
exposes a Delete button only for custom entries.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Grant Form Component + DocumentRequirement Picker

**Files:**
- Create: `apps/web/components/bandi/doc-requirement-picker.tsx`
- Create: `apps/web/components/bandi/grant-form.tsx`

- [ ] **Step 1: Create doc-requirement-picker.tsx**

```typescript
// apps/web/components/bandi/doc-requirement-picker.tsx
"use client";

import { useState } from "react";
import type { DocumentType } from "@prisma/client";

export interface PickedRequirement {
  documentTypeId: string;
  isRequired: boolean;
  notes?: string;
  order: number;
}

interface Props {
  documentTypes: DocumentType[];
  initial?: PickedRequirement[];
  onChange: (items: PickedRequirement[]) => void;
}

export function DocRequirementPicker({ documentTypes, initial, onChange }: Props) {
  const [items, setItems] = useState<PickedRequirement[]>(initial ?? []);

  function update(next: PickedRequirement[]) {
    setItems(next);
    onChange(next);
  }

  function toggle(id: string) {
    const existing = items.find((i) => i.documentTypeId === id);
    if (existing) {
      update(items.filter((i) => i.documentTypeId !== id));
    } else {
      update([...items, { documentTypeId: id, isRequired: true, order: items.length }]);
    }
  }

  function setField<K extends keyof PickedRequirement>(
    id: string,
    key: K,
    value: PickedRequirement[K],
  ) {
    update(items.map((i) => (i.documentTypeId === id ? { ...i, [key]: value } : i)));
  }

  function reorder(id: string, direction: -1 | 1) {
    const idx = items.findIndex((i) => i.documentTypeId === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    update(next.map((i, order) => ({ ...i, order })));
  }

  const selectedIds = new Set(items.map((i) => i.documentTypeId));
  const available = documentTypes.filter((dt) => !selectedIds.has(dt.id));

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Documenti richiesti</p>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun documento selezionato.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, idx) => {
              const dt = documentTypes.find((d) => d.id === item.documentTypeId);
              if (!dt) return null;
              return (
                <li key={item.documentTypeId} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{dt.name}</p>
                      <p className="text-xs text-slate-500">{dt.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={item.isRequired}
                          onChange={(e) => setField(item.documentTypeId, "isRequired", e.target.checked)}
                        />
                        Obbligatorio
                      </label>
                      <button type="button" onClick={() => reorder(item.documentTypeId, -1)} disabled={idx === 0} className="rounded px-2 text-slate-600 disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => reorder(item.documentTypeId, 1)} disabled={idx === items.length - 1} className="rounded px-2 text-slate-600 disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => toggle(item.documentTypeId)} className="rounded px-2 text-red-600">✕</button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Note (opzionali)"
                    defaultValue={item.notes ?? ""}
                    onChange={(e) => setField(item.documentTypeId, "notes", e.target.value)}
                    className="mt-2 block w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {available.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Aggiungi documento</p>
          <div className="flex flex-wrap gap-2">
            {available.map((dt) => (
              <button
                key={dt.id}
                type="button"
                onClick={() => toggle(dt.id)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                + {dt.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Create grant-form.tsx**

```typescript
// apps/web/components/bandi/grant-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentType } from "@prisma/client";
import type { GrantCreateInput } from "@finagevolata/shared";
import { DocRequirementPicker, type PickedRequirement } from "./doc-requirement-picker";

const GRANT_TYPES = [
  { value: "FONDO_PERDUTO", label: "Fondo perduto" },
  { value: "FINANZIAMENTO_AGEVOLATO", label: "Finanziamento agevolato" },
  { value: "CREDITO_IMPOSTA", label: "Credito d'imposta" },
  { value: "GARANZIA", label: "Garanzia" },
] as const;

const COMPANY_SIZES = [
  { value: "MICRO", label: "Micro" },
  { value: "SMALL", label: "Piccola" },
  { value: "MEDIUM", label: "Media" },
  { value: "LARGE", label: "Grande" },
] as const;

const ITALIAN_REGIONS = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia", "Toscana",
  "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto",
];

export interface GrantFormValues extends GrantCreateInput {}

interface Props {
  initial?: Partial<GrantFormValues> & { id?: string };
  mode: "admin" | "consultant-submit";
  documentTypes: DocumentType[];
  onSubmit: (data: GrantFormValues) => Promise<unknown>;
  submitLabel: string;
}

export function GrantForm({ initial, mode, documentTypes, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [hasClickDay, setHasClickDay] = useState(initial?.hasClickDay ?? false);
  const [requirements, setRequirements] = useState<PickedRequirement[]>(
    (initial?.documentRequirements ?? []).map((r, i) => ({
      documentTypeId: r.documentTypeId,
      isRequired: r.isRequired ?? true,
      notes: r.notes,
      order: r.order ?? i,
    })),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const selectedRegions = ITALIAN_REGIONS.filter((r) => fd.get(`region_${r}`) === "on");
    const selectedSizes = COMPANY_SIZES.filter((s) => fd.get(`size_${s.value}`) === "on").map((s) => s.value);
    const ateco = String(fd.get("eligibleAtecoCodes") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const data: GrantFormValues = {
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      issuingBody: String(fd.get("issuingBody") ?? ""),
      grantType: fd.get("grantType") as GrantFormValues["grantType"],
      minAmount: fd.get("minAmount") ? Number(fd.get("minAmount")) : null,
      maxAmount: fd.get("maxAmount") ? Number(fd.get("maxAmount")) : null,
      deadline: (fd.get("deadline") ? new Date(String(fd.get("deadline"))).toISOString() : null) as any,
      openDate: (fd.get("openDate") ? new Date(String(fd.get("openDate"))).toISOString() : null) as any,
      hasClickDay,
      clickDayDate: (hasClickDay && fd.get("clickDayDate")
        ? new Date(String(fd.get("clickDayDate"))).toISOString()
        : null) as any,
      eligibleAtecoCodes: ateco,
      eligibleRegions: selectedRegions,
      eligibleCompanySizes: selectedSizes as GrantFormValues["eligibleCompanySizes"],
      sourceUrl: String(fd.get("sourceUrl") ?? "") || null,
      documentRequirements: requirements,
    };

    startTransition(async () => {
      try {
        await onSubmit(data);
        router.push(mode === "admin" ? "/admin/bandi" : "/consulente/bandi");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Informazioni base">
        <Field label="Titolo"><input name="title" defaultValue={initial?.title} required minLength={5} maxLength={200} className={input} /></Field>
        <Field label="Ente emittente"><input name="issuingBody" defaultValue={initial?.issuingBody} required minLength={2} className={input} /></Field>
        <Field label="Tipo">
          <select name="grantType" defaultValue={initial?.grantType ?? "FONDO_PERDUTO"} required className={input}>
            {GRANT_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="URL ufficiale (opz.)"><input name="sourceUrl" type="url" defaultValue={initial?.sourceUrl ?? ""} className={input} /></Field>
        <Field label="Descrizione"><textarea name="description" defaultValue={initial?.description} required minLength={20} maxLength={5000} rows={6} className={input} /></Field>
      </Section>

      <Section title="Importi e scadenze">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min (EUR)"><input name="minAmount" type="number" min={0} defaultValue={initial?.minAmount ?? ""} className={input} /></Field>
          <Field label="Max (EUR)"><input name="maxAmount" type="number" min={0} defaultValue={initial?.maxAmount ?? ""} className={input} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data apertura"><input name="openDate" type="date" defaultValue={initial?.openDate ? String(initial.openDate).slice(0, 10) : ""} className={input} /></Field>
          <Field label="Scadenza"><input name="deadline" type="date" defaultValue={initial?.deadline ? String(initial.deadline).slice(0, 10) : ""} className={input} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hasClickDay} onChange={(e) => setHasClickDay(e.target.checked)} />
          Click Day
        </label>
        {hasClickDay ? (
          <Field label="Data Click Day"><input name="clickDayDate" type="datetime-local" defaultValue={initial?.clickDayDate ? String(initial.clickDayDate).slice(0, 16) : ""} required className={input} /></Field>
        ) : null}
      </Section>

      <Section title="Eligibilità">
        <Field label="Codici ATECO (separati da virgole)"><input name="eligibleAtecoCodes" defaultValue={(initial?.eligibleAtecoCodes ?? []).join(", ")} className={input} placeholder="62.01, 62.02" /></Field>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Regioni</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {ITALIAN_REGIONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-xs">
                <input type="checkbox" name={`region_${r}`} defaultChecked={initial?.eligibleRegions?.includes(r) ?? false} />
                {r}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Dimensione impresa</p>
          <div className="flex flex-wrap gap-3">
            {COMPANY_SIZES.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`size_${s.value}`} defaultChecked={initial?.eligibleCompanySizes?.includes(s.value) ?? false} />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Documenti richiesti">
        <DocRequirementPicker
          documentTypes={documentTypes}
          initial={requirements}
          onChange={setRequirements}
        />
      </Section>

      {mode === "consultant-submit" ? (
        <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-800">
          Il bando sarà inviato agli amministratori per approvazione prima di essere pubblicato.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Salvataggio…" : submitLabel}
      </button>
    </form>
  );
}

const input = "block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Build to verify types**

```bash
pnpm --filter web build
```

Expected: build clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/bandi/doc-requirement-picker.tsx apps/web/components/bandi/grant-form.tsx
git commit -m "feat(bandi): shared GrantForm + DocumentType requirement picker

Introduces GrantForm client component used by both admin and consultant
flows via the mode prop. Sections: info base, importi/scadenze with
conditional Click Day date, eligibilità (ATECO CSV, regioni grid, size
checkboxes), and DocumentType requirements via the reusable
DocRequirementPicker (toggle, required flag, notes, reorder).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Admin Grant Pages (List, New, Detail, Queue)

**Files:**
- Create: `apps/web/components/bandi/grant-filters.tsx`
- Create: `apps/web/components/bandi/approve-button.tsx`
- Create: `apps/web/components/bandi/reject-dialog.tsx`
- Create: `apps/web/components/bandi/publish-button.tsx`
- Create: `apps/web/app/(dashboard)/admin/bandi/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/bandi/new/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/bandi/[id]/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/bandi/queue/page.tsx`

- [ ] **Step 1: Create grant-filters.tsx**

```typescript
// apps/web/components/bandi/grant-filters.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "", label: "Tutti status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Pubblicato" },
  { value: "CLOSED", label: "Chiuso" },
  { value: "EXPIRED", label: "Scaduto" },
];

const APPROVAL = [
  { value: "", label: "Tutti" },
  { value: "pending", label: "Da approvare" },
  { value: "approved", label: "Approvati" },
];

const TYPES = [
  { value: "", label: "Tutti tipi" },
  { value: "FONDO_PERDUTO", label: "Fondo perduto" },
  { value: "FINANZIAMENTO_AGEVOLATO", label: "Finanziamento" },
  { value: "CREDITO_IMPOSTA", label: "Credito imposta" },
  { value: "GARANZIA", label: "Garanzia" },
];

export function GrantFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/bandi?${next.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select value={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)} className={select}>
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select value={params.get("approved") ?? ""} onChange={(e) => setParam("approved", e.target.value)} className={select}>
        {APPROVAL.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>
      <select value={params.get("type") ?? ""} onChange={(e) => setParam("type", e.target.value)} className={select}>
        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input
        type="search"
        placeholder="Cerca titolo…"
        defaultValue={params.get("q") ?? ""}
        onBlur={(e) => setParam("q", e.currentTarget.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

const select = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
```

- [ ] **Step 2: Create approve + reject + publish buttons**

```typescript
// apps/web/components/bandi/approve-button.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveGrant } from "@/lib/actions/grants";

export function ApproveButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await approveGrant(id);
          router.refresh();
        })
      }
      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {pending ? "…" : "Approva"}
    </button>
  );
}
```

```typescript
// apps/web/components/bandi/reject-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rejectGrant } from "@/lib/actions/grants";

export function RejectDialog({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      await rejectGrant(id, reason);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Rifiuta
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Rifiuta bando</h3>
            <textarea
              required
              minLength={3}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo del rifiuto (visibile al consulente)…"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm">Annulla</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                {pending ? "Rifiuto…" : "Conferma rifiuto"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
```

```typescript
// apps/web/components/bandi/publish-button.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishGrant, closeGrant, deleteGrant } from "@/lib/actions/grants";

export function PublishButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (status === "PUBLISHED") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await closeGrant(id); router.refresh(); })}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "…" : "Chiudi"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await publishGrant(id); router.refresh(); })}
      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
    >
      {pending ? "…" : "Pubblica"}
    </button>
  );
}

export function DeleteGrantButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Eliminare definitivamente il bando?")) return;
        start(async () => { await deleteGrant(id); router.push("/admin/bandi"); });
      }}
      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      Elimina
    </button>
  );
}
```

- [ ] **Step 3: Create admin/bandi/page.tsx (list)**

```typescript
// apps/web/app/(dashboard)/admin/bandi/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { GrantFilters } from "@/components/bandi/grant-filters";

interface PageProps {
  searchParams: Promise<{ status?: string; approved?: string; type?: string; q?: string }>;
}

export default async function AdminBandiPage({ searchParams }: PageProps) {
  const { status, approved, type, q } = await searchParams;
  const where: Prisma.GrantWhereInput = {};
  if (status) where.status = status as any;
  if (approved === "pending") where.approvedByAdmin = false;
  if (approved === "approved") where.approvedByAdmin = true;
  if (type) where.grantType = type as any;
  if (q) where.title = { contains: q, mode: "insensitive" };

  const grants = await prisma.grant.findMany({
    where,
    include: { createdBy: { select: { name: true, role: true } }, _count: { select: { documentRequirements: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bandi</h1>
        <Link href="/admin/bandi/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Nuovo bando
        </Link>
      </div>
      <GrantFilters />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-3">Titolo</th>
              <th className="p-3">Ente</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Status</th>
              <th className="p-3">Approvato</th>
              <th className="p-3">Creato da</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {grants.map((g) => (
              <tr key={g.id} className="border-t border-slate-200 text-sm">
                <td className="p-3 font-medium text-slate-900">{g.title}</td>
                <td className="p-3">{g.issuingBody}</td>
                <td className="p-3">{g.grantType}</td>
                <td className="p-3">{g.status}</td>
                <td className="p-3">{g.approvedByAdmin ? "✓" : "—"}</td>
                <td className="p-3 text-slate-600">{g.createdBy.name} ({g.createdBy.role})</td>
                <td className="p-3 text-right">
                  <Link href={`/admin/bandi/${g.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                    Apri
                  </Link>
                </td>
              </tr>
            ))}
            {grants.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-sm text-slate-500">Nessun bando.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create admin/bandi/new/page.tsx**

```typescript
// apps/web/app/(dashboard)/admin/bandi/new/page.tsx
import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { createGrant } from "@/lib/actions/grants";

export default async function NewBandoPage() {
  const documentTypes = await prisma.documentType.findMany({ orderBy: { name: "asc" } });

  async function action(data: Parameters<typeof createGrant>[0]) {
    "use server";
    await createGrant(data);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Nuovo bando</h1>
      <GrantForm mode="admin" documentTypes={documentTypes} onSubmit={action} submitLabel="Crea bando" />
    </div>
  );
}
```

- [ ] **Step 5: Create admin/bandi/[id]/page.tsx**

```typescript
// apps/web/app/(dashboard)/admin/bandi/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { updateGrant } from "@/lib/actions/grants";
import { ApproveButton } from "@/components/bandi/approve-button";
import { RejectDialog } from "@/components/bandi/reject-dialog";
import { PublishButton, DeleteGrantButton } from "@/components/bandi/publish-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBandoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [grant, documentTypes] = await Promise.all([
    prisma.grant.findUnique({
      where: { id },
      include: {
        documentRequirements: { include: { documentType: true }, orderBy: { order: "asc" } },
        createdBy: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!grant) notFound();

  async function action(data: Parameters<typeof updateGrant>[1]) {
    "use server";
    await updateGrant(id, data);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
          <p className="text-sm text-slate-500">
            Status: <strong>{grant.status}</strong> · Approvato:{" "}
            <strong>{grant.approvedByAdmin ? "sì" : "no"}</strong> · Creato da {grant.createdBy.name} ({grant.createdBy.role})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!grant.approvedByAdmin ? (
            <>
              <ApproveButton id={grant.id} />
              <RejectDialog id={grant.id} />
            </>
          ) : null}
          {grant.approvedByAdmin ? <PublishButton id={grant.id} status={grant.status} /> : null}
          <DeleteGrantButton id={grant.id} />
        </div>
      </div>
      <GrantForm
        mode="admin"
        documentTypes={documentTypes}
        initial={{
          ...grant,
          minAmount: grant.minAmount ? Number(grant.minAmount) : null,
          maxAmount: grant.maxAmount ? Number(grant.maxAmount) : null,
          deadline: grant.deadline?.toISOString() ?? null,
          openDate: grant.openDate?.toISOString() ?? null,
          clickDayDate: grant.clickDayDate?.toISOString() ?? null,
          sourceUrl: grant.sourceUrl ?? null,
          documentRequirements: grant.documentRequirements.map((r) => ({
            documentTypeId: r.documentTypeId,
            isRequired: r.isRequired,
            notes: r.notes ?? undefined,
            order: r.order,
          })),
        }}
        onSubmit={action}
        submitLabel="Salva modifiche"
      />
    </div>
  );
}
```

- [ ] **Step 6: Create admin/bandi/queue/page.tsx**

```typescript
// apps/web/app/(dashboard)/admin/bandi/queue/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ApproveButton } from "@/components/bandi/approve-button";
import { RejectDialog } from "@/components/bandi/reject-dialog";

export default async function QueuePage() {
  const pending = await prisma.grant.findMany({
    where: { approvedByAdmin: false, createdBy: { role: "CONSULTANT" } },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Coda approvazioni</h1>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando in coda.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((g) => (
            <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <Link href={`/admin/bandi/${g.id}`} className="text-base font-semibold text-slate-900 hover:underline">
                  {g.title}
                </Link>
                <p className="text-sm text-slate-500">
                  {g.issuingBody} · proposto da {g.createdBy.name} ({g.createdBy.email})
                </p>
              </div>
              <div className="flex gap-2">
                <ApproveButton id={g.id} />
                <RejectDialog id={g.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Build + commit**

```bash
pnpm --filter web build
```

Expected: build clean, 4 new `/admin/bandi*` routes.

```bash
git add apps/web/components/bandi/grant-filters.tsx apps/web/components/bandi/approve-button.tsx apps/web/components/bandi/reject-dialog.tsx apps/web/components/bandi/publish-button.tsx apps/web/app/\(dashboard\)/admin/bandi
git commit -m "feat(admin): bandi list, filters, create, detail, approval queue

Adds four admin routes:
- /admin/bandi — filtered list with status/approval/type/q filters
- /admin/bandi/new — create form via shared GrantForm
- /admin/bandi/[id] — detail with inline edit form plus approve,
  reject, publish, close, delete actions contextual to state
- /admin/bandi/queue — pending consultant submissions with approve
  and reject actions

Reject dialog captures a required reason passed to rejectGrant so the
consultant receives it via email.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Consultant Bandi Pages (List, New, Detail)

**Files:**
- Create: `apps/web/components/bandi/grant-list-card.tsx`
- Overwrite: `apps/web/app/(dashboard)/consulente/bandi/page.tsx`
- Create: `apps/web/app/(dashboard)/consulente/bandi/new/page.tsx`
- Create: `apps/web/app/(dashboard)/consulente/bandi/[id]/page.tsx`

- [ ] **Step 1: Create grant-list-card.tsx**

```typescript
// apps/web/components/bandi/grant-list-card.tsx
import Link from "next/link";
import type { Grant } from "@prisma/client";

interface Props {
  grant: Grant;
  href: string;
}

export function GrantListCard({ grant, href }: Props) {
  const daysLeft = grant.deadline
    ? Math.ceil((grant.deadline.getTime() - Date.now()) / 86400_000)
    : null;
  const urgency =
    daysLeft != null && daysLeft >= 0 && daysLeft < 7
      ? "bg-red-100 text-red-800"
      : daysLeft != null && daysLeft < 30
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
          {grant.grantType.replace(/_/g, " ")}
        </span>
        {grant.hasClickDay ? (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
            Click Day
          </span>
        ) : null}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900">{grant.title}</h3>
      <p className="mb-3 text-xs text-slate-500">{grant.issuingBody}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">
          {grant.minAmount != null && grant.maxAmount != null
            ? `${fmt(Number(grant.minAmount))} – ${fmt(Number(grant.maxAmount))}`
            : grant.maxAmount != null
            ? `fino a ${fmt(Number(grant.maxAmount))}`
            : "importo non specificato"}
        </span>
        {daysLeft != null ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgency}`}>
            {daysLeft < 0 ? "Scaduto" : `${daysLeft} gg`}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M EUR`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k EUR`;
  return `${n} EUR`;
}
```

- [ ] **Step 2: Overwrite consulente/bandi/page.tsx**

```typescript
// apps/web/app/(dashboard)/consulente/bandi/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GrantListCard } from "@/components/bandi/grant-list-card";

export default async function ConsulenteBandiPage() {
  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bandi</h1>
        <Link href="/consulente/bandi/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Proponi bando
        </Link>
      </div>
      {grants.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando pubblicato.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grants.map((g) => (
            <GrantListCard key={g.id} grant={g} href={`/consulente/bandi/${g.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create consulente/bandi/new/page.tsx**

```typescript
// apps/web/app/(dashboard)/consulente/bandi/new/page.tsx
import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { createGrant } from "@/lib/actions/grants";

export default async function ConsulenteProponiBandoPage() {
  const documentTypes = await prisma.documentType.findMany({ orderBy: { name: "asc" } });

  async function action(data: Parameters<typeof createGrant>[0]) {
    "use server";
    await createGrant(data);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Proponi un bando</h1>
      <GrantForm
        mode="consultant-submit"
        documentTypes={documentTypes}
        onSubmit={action}
        submitLabel="Invia per approvazione"
      />
    </div>
  );
}
```

- [ ] **Step 4: Create consulente/bandi/[id]/page.tsx**

```typescript
// apps/web/app/(dashboard)/consulente/bandi/[id]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { updateGrant } from "@/lib/actions/grants";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsulenteBandoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [grant, documentTypes] = await Promise.all([
    prisma.grant.findUnique({
      where: { id },
      include: {
        documentRequirements: { include: { documentType: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!grant) notFound();
  if (grant.status !== "PUBLISHED" && grant.createdById !== userId) notFound();

  const canEdit = grant.createdById === userId && !grant.approvedByAdmin;

  async function action(data: Parameters<typeof updateGrant>[1]) {
    "use server";
    await updateGrant(id, data);
  }

  if (canEdit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">{grant.title}</h1>
        <p className="mb-6 text-sm text-slate-500">Bozza in attesa di approvazione — modificabile.</p>
        <GrantForm
          mode="consultant-submit"
          documentTypes={documentTypes}
          initial={{
            ...grant,
            minAmount: grant.minAmount ? Number(grant.minAmount) : null,
            maxAmount: grant.maxAmount ? Number(grant.maxAmount) : null,
            deadline: grant.deadline?.toISOString() ?? null,
            openDate: grant.openDate?.toISOString() ?? null,
            clickDayDate: grant.clickDayDate?.toISOString() ?? null,
            sourceUrl: grant.sourceUrl ?? null,
            documentRequirements: grant.documentRequirements.map((r) => ({
              documentTypeId: r.documentTypeId,
              isRequired: r.isRequired,
              notes: r.notes ?? undefined,
              order: r.order,
            })),
          }}
          onSubmit={action}
          submitLabel="Salva modifiche"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
        <p className="text-sm text-slate-500">{grant.issuingBody}</p>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="whitespace-pre-wrap text-sm text-slate-700">{grant.description}</p>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Documenti richiesti</h2>
        <ul className="space-y-2 text-sm">
          {grant.documentRequirements.map((r) => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium">
                {r.documentType.name} {r.isRequired ? "(obbligatorio)" : "(facoltativo)"}
              </p>
              {r.notes ? <p className="text-xs text-slate-500">{r.notes}</p> : null}
            </li>
          ))}
          {grant.documentRequirements.length === 0 ? <li className="text-slate-500">Nessun documento specificato.</li> : null}
        </ul>
      </section>
      {grant.sourceUrl ? (
        <a href={grant.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
          Sito ufficiale →
        </a>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Build + commit**

```bash
pnpm --filter web build
```

Expected: build clean, new consulente routes present.

```bash
git add apps/web/components/bandi/grant-list-card.tsx apps/web/app/\(dashboard\)/consulente/bandi
git commit -m "feat(consulente): bandi public list, submission flow, detail

Replaces consulente bandi stub with:
- Grid of GrantListCard showing only PUBLISHED + approved grants,
  sorted by deadline, with Proponi bando CTA
- /consulente/bandi/new submission form (mode=consultant-submit)
- /consulente/bandi/[id] detail: when the viewer owns an unapproved
  draft they see the editable form; otherwise a read-only view with
  description, document requirements, and official source link

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Company Bandi Pages (List, Detail)

**Files:**
- Overwrite: `apps/web/app/(dashboard)/azienda/bandi/page.tsx`
- Create: `apps/web/app/(dashboard)/azienda/bandi/[id]/page.tsx`

- [ ] **Step 1: Overwrite azienda/bandi/page.tsx**

```typescript
// apps/web/app/(dashboard)/azienda/bandi/page.tsx
import { prisma } from "@/lib/prisma";
import { GrantListCard } from "@/components/bandi/grant-list-card";

export default async function AziendaBandiPage() {
  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Bandi disponibili</h1>
      {grants.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando pubblicato al momento.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grants.map((g) => (
            <GrantListCard key={g.id} grant={g} href={`/azienda/bandi/${g.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create azienda/bandi/[id]/page.tsx**

```typescript
// apps/web/app/(dashboard)/azienda/bandi/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AziendaBandoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const grant = await prisma.grant.findUnique({
    where: { id },
    include: {
      documentRequirements: { include: { documentType: true }, orderBy: { order: "asc" } },
    },
  });
  if (!grant || grant.status !== "PUBLISHED" || !grant.approvedByAdmin) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
        <p className="text-sm text-slate-500">
          {grant.issuingBody} · {grant.grantType.replace(/_/g, " ")}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <Info label="Importo min" value={grant.minAmount != null ? `${Number(grant.minAmount)} EUR` : "—"} />
        <Info label="Importo max" value={grant.maxAmount != null ? `${Number(grant.maxAmount)} EUR` : "—"} />
        <Info label="Apertura" value={grant.openDate ? grant.openDate.toLocaleDateString("it-IT") : "—"} />
        <Info label="Scadenza" value={grant.deadline ? grant.deadline.toLocaleDateString("it-IT") : "—"} />
        {grant.hasClickDay ? <Info label="Click Day" value={grant.clickDayDate ? grant.clickDayDate.toLocaleString("it-IT") : "—"} /> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Descrizione</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{grant.description}</p>
      </section>

      {grant.eligibleAtecoCodes.length + grant.eligibleRegions.length + grant.eligibleCompanySizes.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Eligibilità</h2>
          {grant.eligibleAtecoCodes.length > 0 ? <ChipRow label="ATECO" items={grant.eligibleAtecoCodes} /> : null}
          {grant.eligibleRegions.length > 0 ? <ChipRow label="Regioni" items={grant.eligibleRegions} /> : null}
          {grant.eligibleCompanySizes.length > 0 ? <ChipRow label="Dimensione" items={grant.eligibleCompanySizes} /> : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Documenti richiesti</h2>
        <ul className="space-y-2 text-sm">
          {grant.documentRequirements.map((r) => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium">
                {r.documentType.name} {r.isRequired ? "(obbligatorio)" : "(facoltativo)"}
              </p>
              <p className="text-xs text-slate-500">{r.documentType.category}</p>
              {r.notes ? <p className="mt-1 text-xs text-slate-600">Note: {r.notes}</p> : null}
            </li>
          ))}
          {grant.documentRequirements.length === 0 ? <li className="text-slate-500">Nessun documento specificato.</li> : null}
        </ul>
      </section>

      {grant.sourceUrl ? (
        <a href={grant.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
          Sito ufficiale →
        </a>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{it}</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
pnpm --filter web build
```

Expected: build clean, new azienda routes present (`/azienda/bandi`, `/azienda/bandi/[id]`).

- [ ] **Step 3: Full test + commit**

```bash
pnpm --filter web test
pnpm --filter @finagevolata/shared test
```

Expected: full suite green.

```bash
git add apps/web/app/\(dashboard\)/azienda/bandi
git commit -m "feat(azienda): public bandi list + detail page

Replaces azienda bandi stub with a sorted card grid of published,
approved grants. Detail view exposes amounts, dates, Click Day info,
description, eligibility chips (ATECO, regioni, sizes), required
documents grouped per DocumentType, and the official source URL.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Post-Implementation Verification

After Task 12, perform these manual smoke tests:

### Smoke Tests

1. **Admin bootstrap** — set `ADMIN_EMAILS=<your-email>` in `.env`, restart dev server, login → land on `/admin`, verify DB `user.role = "ADMIN"`.
2. **Seed** — run `pnpm --filter @finagevolata/db prisma:seed`. Visit `/admin/documenti`, confirm 15 rows, all marked "Sì" in "Standard" column.
3. **Admin create custom doc type** — `/admin/documenti` form → slug `"test-custom"`, name "Test Custom", cat LEGAL → save → appears in list with Standard "No".
4. **Admin edit custom doc type** — click Modifica → change description → save → updated.
5. **Admin delete custom doc type** — open edit page → Elimina → gone.
6. **Admin delete standard doc type blocked** — open any standard doc; Elimina button absent (isStandard banner shown).
7. **Admin new bando** — `/admin/bandi/new` → fill all sections, add 3 document requirements → Crea → lands on list, bando visible.
8. **Admin publish** — open bando detail → Pubblica → status PUBLISHED; check `/azienda/bandi` and `/consulente/bandi` — card appears.
9. **Admin close** — published bando detail → Chiudi → status CLOSED; disappears from azienda list (query filters PUBLISHED).
10. **Consultant submit** — login as CONSULTANT → `/consulente/bandi/new` → fill, submit → redirect to list; note bando not in card grid (unapproved).
11. **Admin approve queue** — back to admin → `/admin/bandi/queue` → consultant submission visible → Approva → moves out of queue.
12. **Admin reject queue** — second consultant submission → Rifiuta dialog → reason "Descrizione insufficiente" → confirm → grant deleted, consultant gets email.
13. **Consultant edit own draft** — consultant creates submission → `/consulente/bandi/[id]` shows editable form → change title → save → still unapproved.
14. **Consultant edit own approved blocked** — admin approves consultant draft → consultant revisits detail → sees read-only, edit blocked.
15. **Filters admin list** — `/admin/bandi?status=PUBLISHED` shows only published; `?approved=pending` shows unapproved; `?q=digital` filters title.
16. **Middleware enforcement** — logged out → `/admin/bandi` redirects to `/login`; COMPANY account → `/admin/bandi` redirects.

### Regression

```bash
pnpm --filter web test         # all passing
pnpm --filter @finagevolata/shared test   # all passing
pnpm --filter web build        # clean, routes include all new paths
```

### Env Vars Verification (Vercel)

Ensure these are set in Vercel production environment:

- `ADMIN_EMAILS` — comma-separated admin emails
- `RESEND_API_KEY` — already present
- `EMAIL_FROM` — already present
- `NEXTAUTH_URL` — already present
- `NEXTAUTH_SECRET` — already present
- `DATABASE_URL`, `DIRECT_URL` — already present

### Deploy

```bash
git push origin main
```

Vercel auto-deploys. Run seed on prod (one-time) via:

```bash
DATABASE_URL="<prod-url>" pnpm --filter @finagevolata/db prisma:seed
```

or trigger a Vercel build hook that runs seed post-deploy.
