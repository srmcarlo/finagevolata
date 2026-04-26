# Matching Bandi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP matching module that suggests grants to companies and clients to consultants using a hybrid hard-filter + weighted-score (60% rules + 40% pgvector semantic) algorithm with a lazy-cached AI explanation paragraph.

**Architecture:** A pure TypeScript scoring service (`lib/services/matching.ts`) drives deterministic rule scoring and chip derivation. A server-action layer (`lib/actions/matching.ts`) wraps it with auth, Prisma, pgvector queries via `$queryRaw`, and OpenAI explanation calls cached in a new `GrantMatchExplanation` table. UI components surface the score on the existing company and consultant dashboards plus a new `/azienda/bandi/consigliati` page.

**Tech Stack:** Next.js 15 App Router (RSC + Server Actions), Prisma + PostgreSQL with `pgvector`, NextAuth.js v5, OpenAI Chat Completions (`gpt-4o-mini`), Tailwind + shadcn/ui, Vitest.

**Spec reference:** `docs/superpowers/specs/2026-04-26-matching-bandi-design.md`

---

## File Structure

**New files:**
- `apps/web/lib/services/matching.ts` — Pure scoring functions (no Prisma/auth)
- `apps/web/lib/services/matching.test.ts` — Unit tests for scoring
- `apps/web/lib/actions/matching.ts` — Server actions (auth + Prisma + cache)
- `apps/web/lib/actions/matching.test.ts` — Integration tests with mocked Prisma
- `apps/web/lib/services/match-explanation.ts` — OpenAI prompt + fetch helper
- `apps/web/components/matching/match-score-badge.tsx`
- `apps/web/components/matching/match-chips.tsx`
- `apps/web/components/matching/match-breakdown.tsx`
- `apps/web/components/matching/match-card.tsx`
- `apps/web/components/matching/match-skeleton.tsx`
- `apps/web/app/(dashboard)/azienda/bandi/consigliati/page.tsx`
- `apps/web/app/(dashboard)/consulente/clienti/[id]/page.tsx` (new route — host for the "Bandi compatibili" tab)
- `packages/db/prisma/migrations/20260427000000_add_grant_match_explanation/migration.sql`

**Modified files:**
- `packages/db/prisma/schema.prisma` — Add `GrantMatchExplanation` model + relations + indexes
- `apps/web/lib/actions/onboarding.ts` — Hook into `saveCompanyProfile` to invalidate match cache
- `apps/web/lib/actions/grants-admin.ts` — Hook into publish/update to invalidate match cache
- `apps/web/app/(dashboard)/azienda/page.tsx` — Add "Bandi consigliati" widget
- `apps/web/app/(dashboard)/azienda/bandi/page.tsx` — Add match badge column
- `apps/web/app/(dashboard)/consulente/page.tsx` — Add "Top opportunità clienti" widget
- `apps/web/app/(dashboard)/consulente/bandi/[id]/page.tsx` — Add "Tuoi clienti compatibili" section

---

## Task 1: Prisma schema — `GrantMatchExplanation` + GIN indexes

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/20260427000000_add_grant_match_explanation/migration.sql`

- [ ] **Step 1: Add the new model + relations to schema.prisma**

Add at the end of `schema.prisma` (after the last model):

```prisma
model GrantMatchExplanation {
  id            String   @id @default(cuid())
  companyId     String
  grantId       String
  matchScore    Int
  rulesScore    Int
  semanticScore Int
  matchedChips  String[]
  paragraph     String   @db.Text
  computedAt    DateTime @default(now())

  company User  @relation("CompanyMatches", fields: [companyId], references: [id], onDelete: Cascade)
  grant   Grant @relation(fields: [grantId], references: [id], onDelete: Cascade)

  @@unique([companyId, grantId])
  @@index([companyId, computedAt])
  @@map("grant_match_explanations")
}
```

Then add the opposite relations:

In `model User { ... }`, add this line after `activities         PracticeActivity[]`:
```prisma
  grantMatches  GrantMatchExplanation[] @relation("CompanyMatches")
```

In `model Grant { ... }`, add this line after `chunks               GrantChunk[]`:
```prisma
  matchExplanations GrantMatchExplanation[]
```

- [ ] **Step 2: Generate the migration**

Run from the repo root:
```bash
pnpm --filter @finagevolata/db prisma migrate dev --name add_grant_match_explanation --create-only
```
Expected: a new directory `packages/db/prisma/migrations/20260427000000_add_grant_match_explanation/` containing `migration.sql`.

- [ ] **Step 3: Append GIN indexes to the migration SQL**

Open the generated `migration.sql` and append at the end:

```sql
-- Performance indexes for hard-filter on grants
CREATE INDEX IF NOT EXISTS "idx_grants_ateco_gin"  ON "grants" USING gin ("eligibleAtecoCodes");
CREATE INDEX IF NOT EXISTS "idx_grants_region_gin" ON "grants" USING gin ("eligibleRegions");
```

- [ ] **Step 4: Apply migration locally**

```bash
pnpm --filter @finagevolata/db prisma migrate dev
```
Expected: migration applied, Prisma client regenerated, no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260427000000_add_grant_match_explanation
git commit -m "feat(db): add GrantMatchExplanation model and GIN indexes for matching"
```

---

## Task 2: `atecoMatches` — pure function with precision

**Files:**
- Create: `apps/web/lib/services/matching.ts`
- Test: `apps/web/lib/services/matching.test.ts`

- [ ] **Step 1: Write failing tests for `atecoMatches`**

Create `apps/web/lib/services/matching.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { atecoMatches } from "./matching";

describe("atecoMatches", () => {
  it("returns exact when ateco is identical", () => {
    expect(atecoMatches("62.01", ["62.01"])).toEqual({ matches: true, precision: "exact" });
  });

  it("returns sub when profile is a sub-classification of an eligible code", () => {
    expect(atecoMatches("62.01.01", ["62.01"])).toEqual({ matches: true, precision: "sub" });
  });

  it("returns parent when an eligible code is a sub-classification of profile", () => {
    expect(atecoMatches("62.01", ["62.01.01"])).toEqual({ matches: true, precision: "parent" });
  });

  it("returns prefix when only the 2-digit division matches", () => {
    expect(atecoMatches("62.09", ["62.01"])).toEqual({ matches: true, precision: "prefix" });
  });

  it("returns none when no overlap exists", () => {
    expect(atecoMatches("01.11", ["62.01"])).toEqual({ matches: false, precision: "none" });
  });

  it("handles empty eligible list as none", () => {
    expect(atecoMatches("62.01", [])).toEqual({ matches: false, precision: "none" });
  });

  it("trims whitespace and is case-insensitive on letters (rare edge)", () => {
    expect(atecoMatches(" 62.01 ", [" 62.01 "])).toEqual({ matches: true, precision: "exact" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL — `Cannot find module './matching'` or `atecoMatches is not exported`.

- [ ] **Step 3: Implement `atecoMatches`**

Create `apps/web/lib/services/matching.ts`:

```ts
export type AtecoPrecision = "exact" | "sub" | "parent" | "prefix" | "none";

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

function division(code: string): string {
  return normalize(code).split(".")[0] ?? "";
}

export function atecoMatches(
  profileAteco: string,
  eligibleAtecoCodes: string[]
): { matches: boolean; precision: AtecoPrecision } {
  const p = normalize(profileAteco);
  if (!p || eligibleAtecoCodes.length === 0) {
    return { matches: false, precision: "none" };
  }

  const eligibles = eligibleAtecoCodes.map(normalize).filter(Boolean);

  for (const e of eligibles) {
    if (e === p) return { matches: true, precision: "exact" };
  }
  for (const e of eligibles) {
    if (p.startsWith(e + ".") || (e.length < p.length && p.startsWith(e))) {
      return { matches: true, precision: "sub" };
    }
  }
  for (const e of eligibles) {
    if (e.startsWith(p + ".") || (p.length < e.length && e.startsWith(p))) {
      return { matches: true, precision: "parent" };
    }
  }
  const pDiv = division(p);
  for (const e of eligibles) {
    if (division(e) === pDiv) return { matches: true, precision: "prefix" };
  }
  return { matches: false, precision: "none" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS — 7/7 cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/matching.ts apps/web/lib/services/matching.test.ts
git commit -m "feat(matching): add atecoMatches with precision detection"
```

---

## Task 3: `computeRulesScore` — deterministic rule scoring

**Files:**
- Modify: `apps/web/lib/services/matching.ts`
- Modify: `apps/web/lib/services/matching.test.ts`

- [ ] **Step 1: Add failing tests for `computeRulesScore`**

Append to `matching.test.ts`:

```ts
import { computeRulesScore } from "./matching";
import type { CompanySize } from "@prisma/client";

const baseProfile = {
  atecoCode: "62.01",
  employeeCount: "SMALL" as CompanySize,
  annualRevenue: 500_000,
};

const baseGrant = {
  eligibleAtecoCodes: ["62.01"],
  eligibleCompanySizes: ["SMALL" as CompanySize],
  minAmount: 50_000,
  maxAmount: 200_000,
  deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  approvedByAdmin: true,
};

describe("computeRulesScore", () => {
  it("max score (100) when every criterion is optimal", () => {
    const r = computeRulesScore(baseProfile, baseGrant);
    expect(r.score).toBe(100);
    expect(r.breakdown).toEqual({ ateco: 30, size: 25, amount: 20, deadline: 15, approval: 10 });
  });

  it("ateco prefix only earns 10/30", () => {
    const r = computeRulesScore({ ...baseProfile, atecoCode: "62.09" }, baseGrant);
    expect(r.breakdown.ateco).toBe(10);
  });

  it("ateco sub earns 30/30", () => {
    const r = computeRulesScore({ ...baseProfile, atecoCode: "62.01.01" }, baseGrant);
    expect(r.breakdown.ateco).toBe(30);
  });

  it("size adjacent (MICRO vs SMALL) earns 15/25", () => {
    const r = computeRulesScore({ ...baseProfile, employeeCount: "MICRO" }, baseGrant);
    expect(r.breakdown.size).toBe(15);
  });

  it("size mismatch (LARGE vs SMALL) earns 0/25", () => {
    const r = computeRulesScore({ ...baseProfile, employeeCount: "LARGE" }, baseGrant);
    expect(r.breakdown.size).toBe(0);
  });

  it("amount in [10%, 100%] of revenue earns 20/20", () => {
    const r = computeRulesScore(baseProfile, baseGrant); // 200k vs 500k = 40% → in range
    expect(r.breakdown.amount).toBe(20);
  });

  it("amount above revenue earns 5/20", () => {
    const r = computeRulesScore(
      { ...baseProfile, annualRevenue: 100_000 },
      { ...baseGrant, maxAmount: 1_000_000 }
    );
    expect(r.breakdown.amount).toBe(5);
  });

  it("amount neutral (10/20) when revenue or maxAmount is null", () => {
    const r = computeRulesScore({ ...baseProfile, annualRevenue: null }, baseGrant);
    expect(r.breakdown.amount).toBe(10);
  });

  it("deadline >=60 days earns 15", () => {
    expect(computeRulesScore(baseProfile, baseGrant).breakdown.deadline).toBe(15);
  });

  it("deadline 30-59 days earns 10", () => {
    const d = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    const r = computeRulesScore(baseProfile, { ...baseGrant, deadline: d });
    expect(r.breakdown.deadline).toBe(10);
  });

  it("deadline 15-29 days earns 5", () => {
    const d = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const r = computeRulesScore(baseProfile, { ...baseGrant, deadline: d });
    expect(r.breakdown.deadline).toBe(5);
  });

  it("deadline <15 days earns 0", () => {
    const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const r = computeRulesScore(baseProfile, { ...baseGrant, deadline: d });
    expect(r.breakdown.deadline).toBe(0);
  });

  it("deadline null earns 0", () => {
    const r = computeRulesScore(baseProfile, { ...baseGrant, deadline: null });
    expect(r.breakdown.deadline).toBe(0);
  });

  it("approvedByAdmin=false earns 0/10 approval", () => {
    const r = computeRulesScore(baseProfile, { ...baseGrant, approvedByAdmin: false });
    expect(r.breakdown.approval).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL — `computeRulesScore is not exported`.

- [ ] **Step 3: Implement `computeRulesScore`**

Append to `apps/web/lib/services/matching.ts`:

```ts
import type { CompanySize } from "@prisma/client";

export interface MatchScoreBreakdown {
  ateco: number;
  size: number;
  amount: number;
  deadline: number;
  approval: number;
}

const SIZE_ORDER: CompanySize[] = ["MICRO", "SMALL", "MEDIUM", "LARGE"];

function sizeAdjacency(profile: CompanySize, eligibles: CompanySize[]): number {
  if (eligibles.length === 0) return 0;
  if (eligibles.includes(profile)) return 25;
  const profileIdx = SIZE_ORDER.indexOf(profile);
  const adjacent = eligibles.some((e) => Math.abs(SIZE_ORDER.indexOf(e) - profileIdx) === 1);
  return adjacent ? 15 : 0;
}

function atecoPoints(precision: AtecoPrecision): number {
  switch (precision) {
    case "exact":
    case "sub":
      return 30;
    case "parent":
      return 20;
    case "prefix":
      return 10;
    case "none":
      return 0;
  }
}

function amountPoints(maxAmount: number | null, annualRevenue: number | null): number {
  if (maxAmount == null || annualRevenue == null || annualRevenue <= 0) return 10;
  const ratio = maxAmount / annualRevenue;
  if (ratio >= 0.1 && ratio <= 1.0) return 20;
  return 5;
}

function deadlinePoints(deadline: Date | null): number {
  if (!deadline) return 0;
  const days = Math.floor((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days >= 60) return 15;
  if (days >= 30) return 10;
  if (days >= 15) return 5;
  return 0;
}

export function computeRulesScore(
  profile: { atecoCode: string; employeeCount: CompanySize; annualRevenue: number | null },
  grant: {
    eligibleAtecoCodes: string[];
    eligibleCompanySizes: CompanySize[];
    minAmount: number | null;
    maxAmount: number | null;
    deadline: Date | null;
    approvedByAdmin: boolean;
  }
): { score: number; breakdown: MatchScoreBreakdown } {
  const { precision } = atecoMatches(profile.atecoCode, grant.eligibleAtecoCodes);
  const breakdown: MatchScoreBreakdown = {
    ateco: atecoPoints(precision),
    size: sizeAdjacency(profile.employeeCount, grant.eligibleCompanySizes),
    amount: amountPoints(grant.maxAmount, profile.annualRevenue),
    deadline: deadlinePoints(grant.deadline),
    approval: grant.approvedByAdmin ? 10 : 0,
  };
  const score = breakdown.ateco + breakdown.size + breakdown.amount + breakdown.deadline + breakdown.approval;
  return { score, breakdown };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS — 14 cases green for `computeRulesScore` plus the 7 from Task 2.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/matching.ts apps/web/lib/services/matching.test.ts
git commit -m "feat(matching): add computeRulesScore with deterministic breakdown"
```

---

## Task 4: `combineScores` and `deriveChips`

**Files:**
- Modify: `apps/web/lib/services/matching.ts`
- Modify: `apps/web/lib/services/matching.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `matching.test.ts`:

```ts
import { combineScores, deriveChips } from "./matching";

describe("combineScores", () => {
  it("uses default weight 0.6 rules + 0.4 semantic", () => {
    expect(combineScores(100, 50)).toBe(80); // 0.6*100 + 0.4*50 = 80
  });
  it("rounds to nearest integer", () => {
    expect(combineScores(75, 73)).toBe(74); // 45 + 29.2 = 74.2 → 74
  });
  it("accepts a custom weight override", () => {
    expect(combineScores(100, 0, 0.7)).toBe(70);
  });
});

describe("deriveChips", () => {
  const fullBreakdown = { ateco: 30, size: 25, amount: 20, deadline: 15, approval: 10 };

  it("emits all chips when criteria pass", () => {
    expect(deriveChips(fullBreakdown, 80, true)).toEqual([
      "ATECO compatibile",
      "Dimensione adatta",
      "Importo nel range",
      "Tempistica OK",
      "Settore affine",
      "Approvato",
    ]);
  });

  it("hides ATECO chip when ateco < 20", () => {
    expect(deriveChips({ ...fullBreakdown, ateco: 10 }, 80, true)).not.toContain("ATECO compatibile");
  });

  it("hides Dimensione chip when size != 25 (adjacent or none)", () => {
    expect(deriveChips({ ...fullBreakdown, size: 15 }, 80, true)).not.toContain("Dimensione adatta");
  });

  it("hides Settore affine chip when semanticScore < 70", () => {
    expect(deriveChips(fullBreakdown, 65, true)).not.toContain("Settore affine");
  });

  it("hides Approvato when approvedByAdmin is false", () => {
    expect(deriveChips(fullBreakdown, 80, false)).not.toContain("Approvato");
  });

  it("preserves order regardless of input", () => {
    const chips = deriveChips({ ateco: 30, size: 25, amount: 0, deadline: 15, approval: 10 }, 80, true);
    expect(chips).toEqual(["ATECO compatibile", "Dimensione adatta", "Tempistica OK", "Settore affine", "Approvato"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement `combineScores` and `deriveChips`**

Append to `apps/web/lib/services/matching.ts`:

```ts
export function combineScores(
  rulesScore: number,
  semanticScore: number,
  weightRules = 0.6
): number {
  return Math.round(weightRules * rulesScore + (1 - weightRules) * semanticScore);
}

export function deriveChips(
  breakdown: MatchScoreBreakdown,
  semanticScore: number,
  approvedByAdmin: boolean
): string[] {
  const chips: string[] = [];
  if (breakdown.ateco >= 20) chips.push("ATECO compatibile");
  if (breakdown.size === 25) chips.push("Dimensione adatta");
  if (breakdown.amount >= 15) chips.push("Importo nel range");
  if (breakdown.deadline >= 10) chips.push("Tempistica OK");
  if (semanticScore >= 70) chips.push("Settore affine");
  if (approvedByAdmin) chips.push("Approvato");
  return chips;
}

export interface MatchScore {
  total: number;
  rulesScore: number;
  semanticScore: number;
  breakdown: MatchScoreBreakdown;
  chips: string[];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/matching.ts apps/web/lib/services/matching.test.ts
git commit -m "feat(matching): add combineScores and deriveChips with chip ordering"
```

---

## Task 5: AI explanation helper (OpenAI prompt + fetch)

**Files:**
- Create: `apps/web/lib/services/match-explanation.ts`

- [ ] **Step 1: Create the explanation service**

Create `apps/web/lib/services/match-explanation.ts`:

```ts
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT =
  "Sei consulente di finanza agevolata. Spiega in 2-3 frasi italiane perche il bando e adatto all'azienda. Tono diretto, no markdown, no elenchi.";

export interface ExplanationInput {
  companyName: string;
  atecoCode: string;
  atecoDescription: string;
  region: string;
  employeeCount: string;
  grantTitle: string;
  issuingBody: string;
  minAmount: number | null;
  maxAmount: number | null;
  deadline: Date | null;
  matchScore: number;
  chips: string[];
}

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export async function generateExplanation(input: ExplanationInput): Promise<string | null> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const model = (process.env.OPENAI_ATECO_MODEL ?? "gpt-4o-mini").trim();
  if (!apiKey) {
    console.warn("[match-explanation] missing OPENAI_API_KEY");
    return null;
  }

  const userPrompt = [
    `Azienda: ${input.companyName}, settore ${input.atecoDescription} (${input.atecoCode}), ${input.region}, dim ${input.employeeCount}`,
    `Bando: ${input.grantTitle}, ${input.issuingBody}, importo ${input.minAmount ?? "?"}-${input.maxAmount ?? "?"} EUR, deadline ${input.deadline ? input.deadline.toISOString().slice(0, 10) : "n/d"}`,
    `Match score: ${input.matchScore}%`,
    `Criteri matchati: ${input.chips.join(", ")}`,
    "",
    "Output: paragrafo 2-3 frasi.",
  ].join("\n");

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.warn("[match-explanation] network error", err);
    return null;
  }

  if (!res.ok) {
    console.warn("[match-explanation] HTTP", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as OpenAiResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/services/match-explanation.ts
git commit -m "feat(matching): add generateExplanation OpenAI helper"
```

---

## Task 6: `matchGrantsForCompany` — hard filter + soft scoring

**Files:**
- Create: `apps/web/lib/actions/matching.ts`
- Test: `apps/web/lib/actions/matching.test.ts`

- [ ] **Step 1: Write failing test for the company-side action**

Create `apps/web/lib/actions/matching.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockGrantsRaw = vi.fn();
const mockSimilarityRaw = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    companyProfile: { findUnique: (...a: any[]) => mockProfileFindUnique(...a) },
    $queryRaw: (...a: any[]) => {
      const [query] = a;
      const text = Array.isArray(query) ? query.join("?") : String(query);
      if (text.includes("similarity")) return mockSimilarityRaw(...a);
      return mockGrantsRaw(...a);
    },
  },
}));

import { matchGrantsForCompany } from "./matching";

beforeEach(() => {
  mockAuth.mockReset();
  mockProfileFindUnique.mockReset();
  mockGrantsRaw.mockReset();
  mockSimilarityRaw.mockReset();
});

describe("matchGrantsForCompany", () => {
  it("rejects non-owner companies", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-other", role: "COMPANY" } });
    await expect(matchGrantsForCompany("user-target")).rejects.toThrow("Non autorizzato");
  });

  it("returns empty array when company profile missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(null);
    expect(await matchGrantsForCompany("u1")).toEqual([]);
  });

  it("scores grants returned by hard filter and merges semantic similarity", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue({
      userId: "u1",
      atecoCode: "62.01",
      employeeCount: "SMALL",
      annualRevenue: 500_000,
      region: "Lazio",
      embedding: [0.1],
    });
    mockGrantsRaw.mockResolvedValue([
      {
        id: "g1",
        title: "Bando A",
        eligibleAtecoCodes: ["62.01"],
        eligibleCompanySizes: ["SMALL"],
        eligibleRegions: ["Lazio"],
        minAmount: 50_000,
        maxAmount: 200_000,
        deadline: new Date(Date.now() + 90 * 86400000),
        approvedByAdmin: true,
      },
    ]);
    mockSimilarityRaw.mockResolvedValue([{ id: "g1", similarity: 0.8 }]);

    const result = await matchGrantsForCompany("u1");
    expect(result).toHaveLength(1);
    expect(result[0].grant.id).toBe("g1");
    expect(result[0].score.total).toBeGreaterThanOrEqual(80);
    expect(result[0].score.chips).toContain("ATECO compatibile");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL — `Cannot find module './matching'` for the action.

- [ ] **Step 3: Implement `matchGrantsForCompany` (hard filter + scoring + sort)**

Create `apps/web/lib/actions/matching.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  combineScores,
  computeRulesScore,
  deriveChips,
  type MatchScore,
} from "@/lib/services/matching";
import type { CompanySize, Grant } from "@prisma/client";

type Role = "ADMIN" | "CONSULTANT" | "COMPANY";

async function requireSession(allowed: Role[]) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: Role } | undefined;
  if (!user?.id) throw new Error("Non autorizzato");
  if (!allowed.includes(user.role as Role)) throw new Error("Accesso negato");
  return { userId: user.id, role: user.role as Role };
}

interface HardFilterRow {
  id: string;
  title: string;
  description: string;
  issuingBody: string;
  grantType: string;
  minAmount: number | null;
  maxAmount: number | null;
  deadline: Date | null;
  eligibleAtecoCodes: string[];
  eligibleRegions: string[];
  eligibleCompanySizes: CompanySize[];
  approvedByAdmin: boolean;
}

async function loadEligibleGrants(profile: {
  atecoCode: string;
  region: string;
}): Promise<HardFilterRow[]> {
  const division = profile.atecoCode.split(".")[0] ?? profile.atecoCode;
  return prisma.$queryRaw<HardFilterRow[]>`
    SELECT id, title, description, "issuingBody", "grantType",
           "minAmount"::float8 AS "minAmount",
           "maxAmount"::float8 AS "maxAmount",
           deadline,
           "eligibleAtecoCodes",
           "eligibleRegions",
           "eligibleCompanySizes",
           "approvedByAdmin"
    FROM grants
    WHERE status = 'PUBLISHED'
      AND ${profile.region} = ANY("eligibleRegions")
      AND (
        ${profile.atecoCode} = ANY("eligibleAtecoCodes")
        OR EXISTS (
          SELECT 1 FROM unnest("eligibleAtecoCodes") AS code
          WHERE code LIKE ${division + ".%"} OR code = ${division}
        )
      )
  `;
}

async function loadSimilarities(
  profileEmbedding: unknown,
  grantIds: string[]
): Promise<Map<string, number>> {
  if (!profileEmbedding || grantIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
    SELECT id, 1 - (embedding <=> ${profileEmbedding}::vector) AS similarity
    FROM grants
    WHERE id = ANY(${grantIds}) AND embedding IS NOT NULL
  `;
  return new Map(rows.map((r) => [r.id, r.similarity]));
}

export async function matchGrantsForCompany(
  companyId: string,
  opts?: { limit?: number; offset?: number; minScore?: number }
): Promise<Array<{ grant: Grant; score: MatchScore }>> {
  const { userId, role } = await requireSession(["ADMIN", "CONSULTANT", "COMPANY"]);
  if (role === "COMPANY" && userId !== companyId) throw new Error("Non autorizzato");
  if (role === "CONSULTANT") {
    const link = await prisma.consultantCompany.findFirst({
      where: { consultantId: userId, companyId, status: "ACTIVE" },
    });
    if (!link) throw new Error("Non autorizzato");
  }

  const profile = await prisma.companyProfile.findUnique({ where: { userId: companyId } });
  if (!profile) return [];

  const grants = await loadEligibleGrants({
    atecoCode: profile.atecoCode,
    region: profile.region,
  });
  if (grants.length === 0) return [];

  const sims = await loadSimilarities((profile as any).embedding, grants.map((g) => g.id));

  const annualRevenue =
    profile.annualRevenue == null ? null : Number(profile.annualRevenue);

  const scored = grants
    .map((g) => {
      const rules = computeRulesScore(
        { atecoCode: profile.atecoCode, employeeCount: profile.employeeCount, annualRevenue },
        {
          eligibleAtecoCodes: g.eligibleAtecoCodes,
          eligibleCompanySizes: g.eligibleCompanySizes,
          minAmount: g.minAmount,
          maxAmount: g.maxAmount,
          deadline: g.deadline,
          approvedByAdmin: g.approvedByAdmin,
        }
      );
      const sim = sims.get(g.id);
      const semanticScore = sim == null ? 50 : Math.round(sim * 100);
      const total = combineScores(rules.score, semanticScore);
      const chips = deriveChips(rules.breakdown, semanticScore, g.approvedByAdmin);
      return {
        grant: g as unknown as Grant,
        score: {
          total,
          rulesScore: rules.score,
          semanticScore,
          breakdown: rules.breakdown,
          chips,
        } as MatchScore,
      };
    })
    .filter((r) => (opts?.minScore == null ? true : r.score.total >= opts.minScore))
    .sort((a, b) => b.score.total - a.score.total);

  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? scored.length;
  return scored.slice(offset, offset + limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS — 3/3 cases green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/matching.ts apps/web/lib/actions/matching.test.ts
git commit -m "feat(matching): add matchGrantsForCompany with hard filter + scoring"
```

---

## Task 7: Batch helpers `getMatchScoresForGrants`, `getMatchScoreForGrant`, `getTopMatchesForDashboard`

**Files:**
- Modify: `apps/web/lib/actions/matching.ts`
- Modify: `apps/web/lib/actions/matching.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `apps/web/lib/actions/matching.test.ts`:

```ts
import { getMatchScoreForGrant, getMatchScoresForGrants, getTopMatchesForDashboard } from "./matching";

describe("getMatchScoresForGrants", () => {
  it("returns a Map keyed by grantId for the requested ids only", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue({
      userId: "u1",
      atecoCode: "62.01",
      employeeCount: "SMALL",
      annualRevenue: 500_000,
      region: "Lazio",
      embedding: [0.1],
    });
    mockGrantsRaw.mockResolvedValue([
      {
        id: "g1",
        title: "A",
        eligibleAtecoCodes: ["62.01"],
        eligibleCompanySizes: ["SMALL"],
        eligibleRegions: ["Lazio"],
        minAmount: 50_000, maxAmount: 200_000,
        deadline: new Date(Date.now() + 90 * 86400000),
        approvedByAdmin: true,
      },
      {
        id: "g2",
        title: "B",
        eligibleAtecoCodes: ["62.01"],
        eligibleCompanySizes: ["SMALL"],
        eligibleRegions: ["Lazio"],
        minAmount: 1_000, maxAmount: 5_000,
        deadline: null,
        approvedByAdmin: false,
      },
    ]);
    mockSimilarityRaw.mockResolvedValue([]);

    const result = await getMatchScoresForGrants("u1", ["g1", "g2", "g999"]);
    expect(result.size).toBe(2);
    expect(result.get("g1")?.total).toBeGreaterThan(result.get("g2")!.total);
    expect(result.has("g999")).toBe(false);
  });
});

describe("getTopMatchesForDashboard", () => {
  it("returns at most `limit` rows ordered by score", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue({
      userId: "u1",
      atecoCode: "62.01",
      employeeCount: "SMALL",
      annualRevenue: 500_000,
      region: "Lazio",
      embedding: [0.1],
    });
    mockGrantsRaw.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: `g${i}`,
        title: `Grant ${i}`,
        eligibleAtecoCodes: ["62.01"],
        eligibleCompanySizes: ["SMALL"],
        eligibleRegions: ["Lazio"],
        minAmount: 50_000, maxAmount: 200_000,
        deadline: new Date(Date.now() + 90 * 86400000),
        approvedByAdmin: i % 2 === 0,
      }))
    );
    mockSimilarityRaw.mockResolvedValue([]);

    const top = await getTopMatchesForDashboard("u1", 3);
    expect(top).toHaveLength(3);
    expect(top[0].score.total).toBeGreaterThanOrEqual(top[2].score.total);
  });
});

describe("getMatchScoreForGrant", () => {
  it("returns null when grant is not in the eligible set", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue({
      userId: "u1",
      atecoCode: "62.01",
      employeeCount: "SMALL",
      annualRevenue: 500_000,
      region: "Lazio",
      embedding: [0.1],
    });
    mockGrantsRaw.mockResolvedValue([]);
    mockSimilarityRaw.mockResolvedValue([]);

    const score = await getMatchScoreForGrant("u1", "g-missing");
    expect(score).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement the three helpers**

Append to `apps/web/lib/actions/matching.ts`:

```ts
export async function getMatchScoresForGrants(
  companyId: string,
  grantIds: string[]
): Promise<Map<string, MatchScore>> {
  if (grantIds.length === 0) return new Map();
  const all = await matchGrantsForCompany(companyId);
  const wanted = new Set(grantIds);
  const map = new Map<string, MatchScore>();
  for (const r of all) {
    if (wanted.has(r.grant.id)) map.set(r.grant.id, r.score);
  }
  return map;
}

export async function getMatchScoreForGrant(
  companyId: string,
  grantId: string
): Promise<MatchScore | null> {
  const m = await getMatchScoresForGrants(companyId, [grantId]);
  return m.get(grantId) ?? null;
}

export async function getTopMatchesForDashboard(
  companyId: string,
  limit = 5
): Promise<Array<{ grant: Grant; score: MatchScore }>> {
  return matchGrantsForCompany(companyId, { limit });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/matching.ts apps/web/lib/actions/matching.test.ts
git commit -m "feat(matching): add batch and single helpers for grant scoring"
```

---

## Task 8: `getMatchExplanation` — cache + lazy AI generation

**Files:**
- Modify: `apps/web/lib/actions/matching.ts`
- Modify: `apps/web/lib/actions/matching.test.ts`

- [ ] **Step 1: Add failing tests for cache hit/miss + TTL**

Append to `apps/web/lib/actions/matching.test.ts`:

```ts
const mockExplFindUnique = vi.fn();
const mockExplUpsert = vi.fn();
const mockExplDelete = vi.fn();
const mockGrantFindUnique = vi.fn();
const mockGenerateExplanation = vi.fn();

vi.mock("@/lib/services/match-explanation", () => ({
  generateExplanation: (...a: any[]) => mockGenerateExplanation(...a),
}));

// Re-mock prisma with explanation helpers (extend earlier mock):
vi.mock("@/lib/prisma", () => ({
  prisma: {
    companyProfile: { findUnique: (...a: any[]) => mockProfileFindUnique(...a) },
    grant: { findUnique: (...a: any[]) => mockGrantFindUnique(...a) },
    grantMatchExplanation: {
      findUnique: (...a: any[]) => mockExplFindUnique(...a),
      upsert: (...a: any[]) => mockExplUpsert(...a),
      delete: (...a: any[]) => mockExplDelete(...a),
      deleteMany: vi.fn(),
    },
    consultantCompany: { findFirst: vi.fn() },
    $queryRaw: (...a: any[]) => {
      const [query] = a;
      const text = Array.isArray(query) ? query.join("?") : String(query);
      if (text.includes("similarity")) return mockSimilarityRaw(...a);
      return mockGrantsRaw(...a);
    },
  },
}));

import { getMatchExplanation } from "./matching";

beforeEach(() => {
  mockExplFindUnique.mockReset();
  mockExplUpsert.mockReset();
  mockExplDelete.mockReset();
  mockGrantFindUnique.mockReset();
  mockGenerateExplanation.mockReset();
});

describe("getMatchExplanation", () => {
  const profile = {
    userId: "u1", companyName: "Acme",
    atecoCode: "62.01", atecoDescription: "Software",
    employeeCount: "SMALL", annualRevenue: 500_000,
    region: "Lazio", embedding: [0.1],
  };
  const grant = {
    id: "g1", title: "Bando A", description: "...", issuingBody: "MISE",
    grantType: "FONDO_PERDUTO",
    minAmount: 50_000, maxAmount: 200_000,
    deadline: new Date(Date.now() + 90 * 86400000),
    eligibleAtecoCodes: ["62.01"], eligibleRegions: ["Lazio"],
    eligibleCompanySizes: ["SMALL"], approvedByAdmin: true,
  };

  it("returns cached row without calling OpenAI when fresh", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(profile);
    mockGrantsRaw.mockResolvedValue([grant]);
    mockSimilarityRaw.mockResolvedValue([{ id: "g1", similarity: 0.8 }]);
    mockExplFindUnique.mockResolvedValue({
      paragraph: "cached paragraph",
      matchedChips: ["ATECO compatibile"],
      matchScore: 90,
      rulesScore: 95,
      semanticScore: 80,
      computedAt: new Date(),
    });

    const result = await getMatchExplanation("u1", "g1");
    expect(result.fromCache).toBe(true);
    expect(result.paragraph).toBe("cached paragraph");
    expect(mockGenerateExplanation).not.toHaveBeenCalled();
  });

  it("calls OpenAI on cache miss and upserts the row", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(profile);
    mockGrantsRaw.mockResolvedValue([grant]);
    mockSimilarityRaw.mockResolvedValue([{ id: "g1", similarity: 0.8 }]);
    mockExplFindUnique.mockResolvedValue(null);
    mockGrantFindUnique.mockResolvedValue(grant);
    mockGenerateExplanation.mockResolvedValue("AI generated paragraph");
    mockExplUpsert.mockResolvedValue({});

    const result = await getMatchExplanation("u1", "g1");
    expect(result.fromCache).toBe(false);
    expect(result.paragraph).toBe("AI generated paragraph");
    expect(mockGenerateExplanation).toHaveBeenCalledTimes(1);
    expect(mockExplUpsert).toHaveBeenCalledTimes(1);
  });

  it("invalidates a row older than 30 days and recomputes", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(profile);
    mockGrantsRaw.mockResolvedValue([grant]);
    mockSimilarityRaw.mockResolvedValue([{ id: "g1", similarity: 0.8 }]);
    const oldDate = new Date(Date.now() - 31 * 86400000);
    mockExplFindUnique.mockResolvedValue({
      paragraph: "stale",
      matchedChips: [],
      matchScore: 50, rulesScore: 50, semanticScore: 50,
      computedAt: oldDate,
    });
    mockGrantFindUnique.mockResolvedValue(grant);
    mockGenerateExplanation.mockResolvedValue("fresh paragraph");
    mockExplUpsert.mockResolvedValue({});

    const result = await getMatchExplanation("u1", "g1");
    expect(result.fromCache).toBe(false);
    expect(result.paragraph).toBe("fresh paragraph");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement `getMatchExplanation`**

Add to `apps/web/lib/actions/matching.ts`:

```ts
import { generateExplanation } from "@/lib/services/match-explanation";

const EXPLANATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getMatchExplanation(
  companyId: string,
  grantId: string
): Promise<{
  paragraph: string;
  chips: string[];
  score: MatchScore;
  fromCache: boolean;
}> {
  const score = await getMatchScoreForGrant(companyId, grantId);
  if (!score) throw new Error("Bando non eleggibile per questa azienda");

  const cached = await prisma.grantMatchExplanation.findUnique({
    where: { companyId_grantId: { companyId, grantId } },
  });

  const isFresh =
    cached && Date.now() - cached.computedAt.getTime() < EXPLANATION_TTL_MS;

  if (cached && isFresh) {
    return {
      paragraph: cached.paragraph,
      chips: cached.matchedChips,
      score,
      fromCache: true,
    };
  }

  const profile = await prisma.companyProfile.findUnique({ where: { userId: companyId } });
  const grant = await prisma.grant.findUnique({ where: { id: grantId } });
  if (!profile || !grant) throw new Error("Dati non disponibili");

  const paragraph =
    (await generateExplanation({
      companyName: profile.companyName,
      atecoCode: profile.atecoCode,
      atecoDescription: profile.atecoDescription,
      region: profile.region,
      employeeCount: profile.employeeCount,
      grantTitle: grant.title,
      issuingBody: grant.issuingBody,
      minAmount: grant.minAmount == null ? null : Number(grant.minAmount),
      maxAmount: grant.maxAmount == null ? null : Number(grant.maxAmount),
      deadline: grant.deadline,
      matchScore: score.total,
      chips: score.chips,
    })) ?? "Non e' stato possibile generare la spiegazione automatica.";

  await prisma.grantMatchExplanation.upsert({
    where: { companyId_grantId: { companyId, grantId } },
    create: {
      companyId,
      grantId,
      matchScore: score.total,
      rulesScore: score.rulesScore,
      semanticScore: score.semanticScore,
      matchedChips: score.chips,
      paragraph,
    },
    update: {
      matchScore: score.total,
      rulesScore: score.rulesScore,
      semanticScore: score.semanticScore,
      matchedChips: score.chips,
      paragraph,
      computedAt: new Date(),
    },
  });

  return { paragraph, chips: score.chips, score, fromCache: false };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/matching.ts apps/web/lib/actions/matching.test.ts
git commit -m "feat(matching): add getMatchExplanation with 30-day cache TTL"
```

---

## Task 9: `invalidateMatchExplanations` + onboarding/grants-admin hooks

**Files:**
- Modify: `apps/web/lib/actions/matching.ts`
- Modify: `apps/web/lib/actions/matching.test.ts`
- Modify: `apps/web/lib/actions/onboarding.ts`
- Modify: `apps/web/lib/actions/grants.ts`

- [ ] **Step 1: Add failing tests**

Append to `apps/web/lib/actions/matching.test.ts`:

```ts
import { invalidateMatchExplanations } from "./matching";

describe("invalidateMatchExplanations", () => {
  it("deletes by companyId", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 });
    (prisma as any).grantMatchExplanation.deleteMany = deleteMany;
    await invalidateMatchExplanations({ companyId: "u1" });
    expect(deleteMany).toHaveBeenCalledWith({ where: { companyId: "u1" } });
  });

  it("deletes by grantId", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 5 });
    (prisma as any).grantMatchExplanation.deleteMany = deleteMany;
    await invalidateMatchExplanations({ grantId: "g1" });
    expect(deleteMany).toHaveBeenCalledWith({ where: { grantId: "g1" } });
  });

  it("no-ops with no filters", async () => {
    const deleteMany = vi.fn();
    (prisma as any).grantMatchExplanation.deleteMany = deleteMany;
    await invalidateMatchExplanations({});
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
```

Add at the top of the test file with other imports:
```ts
import { prisma } from "@/lib/prisma";
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL — `invalidateMatchExplanations is not exported`.

- [ ] **Step 3: Implement the action and call it from hooks**

Append to `apps/web/lib/actions/matching.ts`:

```ts
export async function invalidateMatchExplanations(opts: {
  companyId?: string;
  grantId?: string;
}): Promise<void> {
  if (opts.companyId) {
    await prisma.grantMatchExplanation.deleteMany({ where: { companyId: opts.companyId } });
    return;
  }
  if (opts.grantId) {
    await prisma.grantMatchExplanation.deleteMany({ where: { grantId: opts.grantId } });
    return;
  }
}
```

Modify `apps/web/lib/actions/onboarding.ts` — at the top of the file add:
```ts
import { invalidateMatchExplanations } from "@/lib/actions/matching";
```
After the `await prisma.companyProfile.upsert(...)` call inside `saveCompanyProfile`, add:
```ts
  await invalidateMatchExplanations({ companyId: userId });
```

Modify `apps/web/lib/actions/grants.ts` — at the top of the file add:
```ts
import { invalidateMatchExplanations } from "@/lib/actions/matching";
```

Hook the call into the four lifecycle functions, immediately after their `prisma.grant.update(...)` (or, for `updateGrant`, after the transaction):

In `updateGrant(id, input)` (~line 80) — after the existing `prisma.grant.update(...)` succeeds:
```ts
  await invalidateMatchExplanations({ grantId: id });
```

In `approveGrant(id)` (~line 126) — after `prisma.grant.update(...)`:
```ts
  await invalidateMatchExplanations({ grantId: id });
```

In `publishGrant(id)` (~line 161) — after `prisma.grant.update(...)`:
```ts
  await invalidateMatchExplanations({ grantId: id });
```

In `closeGrant(id)` (~line 173) — after `prisma.grant.update(...)`:
```ts
  await invalidateMatchExplanations({ grantId: id });
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/matching.ts apps/web/lib/actions/matching.test.ts apps/web/lib/actions/onboarding.ts apps/web/lib/actions/grants.ts
git commit -m "feat(matching): add invalidateMatchExplanations and hook into profile/grant updates"
```

---

## Task 10: Consultant-side actions

**Files:**
- Modify: `apps/web/lib/actions/matching.ts`
- Modify: `apps/web/lib/actions/matching.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `apps/web/lib/actions/matching.test.ts`:

```ts
import {
  matchClientsForGrant,
  matchGrantsForConsultantClients,
  getTopOpportunitiesForConsultant,
} from "./matching";

const mockConsultantCompanyFindMany = vi.fn();
const mockPracticeFindMany = vi.fn();
(prisma as any).consultantCompany.findMany = (...a: any[]) => mockConsultantCompanyFindMany(...a);
(prisma as any).practice = { findMany: (...a: any[]) => mockPracticeFindMany(...a) };

beforeEach(() => {
  mockConsultantCompanyFindMany.mockReset();
  mockPracticeFindMany.mockReset();
});

describe("matchClientsForGrant", () => {
  it("returns clients with score and a hasPractice flag", async () => {
    mockAuth.mockResolvedValue({ user: { id: "c1", role: "CONSULTANT" } });
    mockConsultantCompanyFindMany.mockResolvedValue([
      { companyId: "u1", company: { name: "Acme" } },
      { companyId: "u2", company: { name: "Beta" } },
    ]);
    mockProfileFindUnique
      .mockResolvedValueOnce({
        userId: "u1", atecoCode: "62.01", employeeCount: "SMALL",
        annualRevenue: 500_000, region: "Lazio", embedding: [0.1],
      })
      .mockResolvedValueOnce({
        userId: "u2", atecoCode: "62.01", employeeCount: "MEDIUM",
        annualRevenue: 1_000_000, region: "Lazio", embedding: [0.2],
      });
    mockGrantsRaw.mockResolvedValue([
      {
        id: "g1", title: "A",
        eligibleAtecoCodes: ["62.01"], eligibleCompanySizes: ["SMALL"],
        eligibleRegions: ["Lazio"], minAmount: 50_000, maxAmount: 200_000,
        deadline: new Date(Date.now() + 90 * 86400000), approvedByAdmin: true,
      },
    ]);
    mockSimilarityRaw.mockResolvedValue([]);
    mockPracticeFindMany.mockResolvedValue([{ companyId: "u1", grantId: "g1" }]);

    const out = await matchClientsForGrant("c1", "g1");
    expect(out).toHaveLength(2);
    const u1 = out.find((r) => r.companyId === "u1")!;
    expect(u1.hasPractice).toBe(true);
    expect(u1.score.total).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement consultant-side actions**

Append to `apps/web/lib/actions/matching.ts`:

```ts
async function loadConsultantClients(consultantId: string) {
  return prisma.consultantCompany.findMany({
    where: { consultantId, status: "ACTIVE" },
    include: { company: true },
  });
}

export async function matchClientsForGrant(
  consultantId: string,
  grantId: string
): Promise<Array<{ companyId: string; companyName: string; score: MatchScore; hasPractice: boolean }>> {
  const { userId } = await requireSession(["CONSULTANT", "ADMIN"]);
  if (userId !== consultantId) throw new Error("Non autorizzato");

  const links = await loadConsultantClients(consultantId);
  if (links.length === 0) return [];

  const practices = await prisma.practice.findMany({
    where: { consultantId, grantId, companyId: { in: links.map((l) => l.companyId) } },
    select: { companyId: true },
  });
  const practiceSet = new Set(practices.map((p) => p.companyId));

  const results: Array<{
    companyId: string;
    companyName: string;
    score: MatchScore;
    hasPractice: boolean;
  }> = [];
  for (const link of links) {
    const score = await getMatchScoreForGrant(link.companyId, grantId);
    if (!score) continue;
    results.push({
      companyId: link.companyId,
      companyName: link.company.name,
      score,
      hasPractice: practiceSet.has(link.companyId),
    });
  }
  return results.sort((a, b) => b.score.total - a.score.total);
}

export async function matchGrantsForConsultantClients(
  consultantId: string,
  opts?: { clientId?: string; topNPerClient?: number }
): Promise<Map<string, Array<{ grant: Grant; score: MatchScore }>>> {
  const { userId } = await requireSession(["CONSULTANT", "ADMIN"]);
  if (userId !== consultantId) throw new Error("Non autorizzato");

  const links = await loadConsultantClients(consultantId);
  const targetIds = opts?.clientId ? [opts.clientId] : links.map((l) => l.companyId);
  const top = opts?.topNPerClient ?? 5;

  const out = new Map<string, Array<{ grant: Grant; score: MatchScore }>>();
  for (const id of targetIds) {
    out.set(id, await matchGrantsForCompany(id, { limit: top }));
  }
  return out;
}

export async function getTopOpportunitiesForConsultant(
  consultantId: string,
  limit = 10
): Promise<Array<{ companyId: string; companyName: string; grant: Grant; score: MatchScore; priority: number }>> {
  const all = await matchGrantsForConsultantClients(consultantId);
  const links = await loadConsultantClients(consultantId);
  const nameById = new Map(links.map((l) => [l.companyId, l.company.name]));

  const flat: Array<{
    companyId: string;
    companyName: string;
    grant: Grant;
    score: MatchScore;
    priority: number;
  }> = [];
  for (const [companyId, rows] of all) {
    for (const r of rows) {
      const days =
        r.grant.deadline == null
          ? null
          : Math.floor((r.grant.deadline.getTime() - Date.now()) / 86400000);
      const urgency = days == null ? 0 : Math.max(0, Math.min(1, 1 - days / 90));
      const priority = r.score.total + 20 * urgency;
      flat.push({
        companyId,
        companyName: nameById.get(companyId) ?? "",
        grant: r.grant,
        score: r.score,
        priority,
      });
    }
  }
  return flat.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test -- matching.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/matching.ts apps/web/lib/actions/matching.test.ts
git commit -m "feat(matching): add consultant-side match actions with priority"
```

---

## Task 11: UI primitives — badge, chips, breakdown, skeleton

**Files:**
- Create: `apps/web/components/matching/match-score-badge.tsx`
- Create: `apps/web/components/matching/match-chips.tsx`
- Create: `apps/web/components/matching/match-breakdown.tsx`
- Create: `apps/web/components/matching/match-skeleton.tsx`

- [ ] **Step 1: Create `match-score-badge.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function MatchScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 70 ? "bg-green-100 text-green-800"
    : score >= 40 ? "bg-amber-100 text-amber-800"
    : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}>
      {score}% match
    </span>
  );
}
```

- [ ] **Step 2: Create `match-chips.tsx`**

```tsx
export function MatchChips({ chips }: { chips: string[] }) {
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 ring-1 ring-blue-200">
          {c}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Create `match-breakdown.tsx`**

```tsx
import type { MatchScoreBreakdown } from "@/lib/services/matching";

export function MatchBreakdown({
  breakdown,
  semanticScore,
}: {
  breakdown: MatchScoreBreakdown;
  semanticScore: number;
}) {
  const rows = [
    { label: "ATECO", value: breakdown.ateco, max: 30 },
    { label: "Dimensione", value: breakdown.size, max: 25 },
    { label: "Importo", value: breakdown.amount, max: 20 },
    { label: "Deadline", value: breakdown.deadline, max: 15 },
    { label: "Approvato admin", value: breakdown.approval, max: 10 },
    { label: "Affinita semantica", value: semanticScore, max: 100 },
  ];
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b last:border-0">
            <td className="py-1.5 text-slate-600">{r.label}</td>
            <td className="py-1.5 text-right tabular-nums text-slate-900">{r.value}/{r.max}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Create `match-skeleton.tsx`**

```tsx
export function MatchSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-4">
      <div className="h-4 w-2/3 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-20 rounded-full bg-slate-200" />
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/matching
git commit -m "feat(matching): add UI primitives (badge, chips, breakdown, skeleton)"
```

---

## Task 12: `MatchCard` component

**Files:**
- Create: `apps/web/components/matching/match-card.tsx`

- [ ] **Step 1: Create the card**

```tsx
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
  grant: { id: string; title: string; issuingBody: string; maxAmount: number | null; deadline: Date | null };
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
      fetchExplanation().then((r) => setParagraph(r.paragraph)).catch(() => setParagraph(null));
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
          <dd className="font-medium">{grant.maxAmount ? `${grant.maxAmount.toLocaleString("it-IT")} EUR` : "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Scadenza</dt>
          <dd className="font-medium">{grant.deadline ? grant.deadline.toLocaleDateString("it-IT") : "—"}</dd>
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/matching/match-card.tsx
git commit -m "feat(matching): add MatchCard with lazy explanation and toggleable breakdown"
```

---

## Task 13: Company dashboard — "Bandi consigliati" widget

**Files:**
- Modify: `apps/web/app/(dashboard)/azienda/page.tsx`

- [ ] **Step 1: Read the current dashboard end to find the insertion point**

```bash
sed -n '1,200p' apps/web/app/'(dashboard)'/azienda/page.tsx
```
Identify the closing `</div>` of the existing stats grid; the widget goes after it, before the page wrapper closes.

- [ ] **Step 2: Add the widget**

In `apps/web/app/(dashboard)/azienda/page.tsx`:

At the top, add imports:
```ts
import { getTopMatchesForDashboard } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
import { MatchChips } from "@/components/matching/match-chips";
```

Right before the `Promise.all([...])`, alongside it add another concurrent call:
```ts
const topMatchesPromise = getTopMatchesForDashboard(userId, 5);
```
Then `await topMatchesPromise` after the existing `Promise.all`.

Insert this JSX block after the existing stats grid:
```tsx
<section className="mt-8">
  <div className="mb-3 flex items-end justify-between">
    <h2 className="text-lg font-semibold text-slate-900">Bandi consigliati per te</h2>
    <Link href="/azienda/bandi/consigliati" className="text-sm text-blue-600 hover:underline">
      Vedi tutti
    </Link>
  </div>
  {topMatches.length === 0 ? (
    <p className="text-sm text-slate-500">Completa il profilo per vedere i bandi piu adatti.</p>
  ) : (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {topMatches.map(({ grant, score }) => (
        <li key={grant.id} className="rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/azienda/bandi/${grant.id}`} className="font-medium text-slate-900 hover:underline">
              {grant.title}
            </Link>
            <MatchScoreBadge score={score.total} />
          </div>
          <p className="text-xs text-slate-500">{grant.issuingBody}</p>
          <div className="mt-2"><MatchChips chips={score.chips.slice(0, 3)} /></div>
        </li>
      ))}
    </ul>
  )}
</section>
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/'(dashboard)'/azienda/page.tsx
git commit -m "feat(matching): add 'Bandi consigliati' widget to company dashboard"
```

---

## Task 14: Company grants list — match badge column

**Files:**
- Modify: `apps/web/app/(dashboard)/azienda/bandi/page.tsx`
- Modify: `apps/web/components/bandi/grant-list-card.tsx`

- [ ] **Step 1: Modify the page to fetch scores in batch**

Replace the contents of `apps/web/app/(dashboard)/azienda/bandi/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrantListCard } from "@/components/bandi/grant-list-card";
import { getMatchScoresForGrants } from "@/lib/actions/matching";

export default async function AziendaBandiPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  const scores = userId
    ? await getMatchScoresForGrants(userId, grants.map((g) => g.id))
    : new Map();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Bandi disponibili</h1>
      {grants.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando pubblicato al momento.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grants.map((g) => (
            <GrantListCard key={g.id} grant={g} href={`/azienda/bandi/${g.id}`} matchScore={scores.get(g.id)?.total} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the `matchScore` prop to `GrantListCard`**

In `apps/web/components/bandi/grant-list-card.tsx`:

Add the import at the top:
```ts
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
```

Extend the props type to include `matchScore?: number`. In the JSX, render the badge in the card header, e.g. next to the title:
```tsx
{typeof matchScore === "number" && <MatchScoreBadge score={matchScore} className="ml-auto" />}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/'(dashboard)'/azienda/bandi/page.tsx apps/web/components/bandi/grant-list-card.tsx
git commit -m "feat(matching): show match score badge in company grants list"
```

---

## Task 15: New page `/azienda/bandi/consigliati`

**Files:**
- Create: `apps/web/app/(dashboard)/azienda/bandi/consigliati/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { matchGrantsForCompany, getMatchExplanation } from "@/lib/actions/matching";
import { MatchCard } from "@/components/matching/match-card";

export default async function ConsigliatiPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/auth/login");

  const matches = await matchGrantsForCompany(userId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Bandi consigliati per te</h1>
        <p className="text-sm text-slate-500">Ordinati per affinita con il tuo profilo.</p>
      </header>

      {matches.length === 0 ? (
        <p className="text-sm text-slate-500">Nessun bando compatibile trovato. Verifica regione e codice ATECO sul tuo profilo.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {matches.map(({ grant, score }) => (
            <li key={grant.id}>
              <MatchCard
                grant={{
                  id: grant.id,
                  title: grant.title,
                  issuingBody: grant.issuingBody,
                  maxAmount: grant.maxAmount == null ? null : Number(grant.maxAmount),
                  deadline: grant.deadline,
                }}
                score={score}
                href={`/azienda/bandi/${grant.id}`}
                fetchExplanation={async () => {
                  "use server";
                  const r = await getMatchExplanation(userId, grant.id);
                  return { paragraph: r.paragraph };
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
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
git add apps/web/app/'(dashboard)'/azienda/bandi/consigliati
git commit -m "feat(matching): add /azienda/bandi/consigliati page with AI explanations"
```

---

## Task 16: Consultant dashboard — "Top opportunità clienti"

**Files:**
- Modify: `apps/web/app/(dashboard)/consulente/page.tsx`

- [ ] **Step 1: Add the widget**

In `apps/web/app/(dashboard)/consulente/page.tsx`:

Add imports:
```ts
import Link from "next/link";
import { getTopOpportunitiesForConsultant } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
```

Inside the dashboard component, before the existing stats `Promise.all`, add another `await`:
```ts
const opportunities = await getTopOpportunitiesForConsultant(userId, 10);
```

Append this section after the stats grid:
```tsx
<section className="mt-8">
  <h2 className="mb-3 text-lg font-semibold text-slate-900">Top opportunita clienti</h2>
  {opportunities.length === 0 ? (
    <p className="text-sm text-slate-500">Nessuna opportunita rilevante. Aggiungi clienti o aspetta nuovi bandi.</p>
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
              <td className="px-3 py-2"><MatchScoreBadge score={o.score.total} /></td>
              <td className="px-3 py-2">{o.grant.deadline ? new Date(o.grant.deadline).toLocaleDateString("it-IT") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/'(dashboard)'/consulente/page.tsx
git commit -m "feat(matching): add top opportunities widget to consultant dashboard"
```

---

## Task 17: Consultant grant page — "Tuoi clienti compatibili"

**Files:**
- Modify: `apps/web/app/(dashboard)/consulente/bandi/[id]/page.tsx`

- [ ] **Step 1: Read the existing page structure**

```bash
sed -n '1,200p' apps/web/app/'(dashboard)'/consulente/bandi/'[id]'/page.tsx
```
Identify the section after the grant detail block where the new client list goes.

- [ ] **Step 2: Add the section**

Add the imports at the top:
```ts
import { auth } from "@/lib/auth";
import { matchClientsForGrant } from "@/lib/actions/matching";
import { MatchScoreBadge } from "@/components/matching/match-score-badge";
```

Inside the page component, after fetching the grant:
```ts
const session = await auth();
const consultantId = (session?.user as { id?: string } | undefined)?.id ?? "";
const compatibleClients = consultantId ? await matchClientsForGrant(consultantId, params.id) : [];
```

Append this section to the JSX:
```tsx
<section className="mt-8">
  <h2 className="mb-3 text-lg font-semibold text-slate-900">Tuoi clienti compatibili</h2>
  {compatibleClients.length === 0 ? (
    <p className="text-sm text-slate-500">Nessun cliente compatibile con questo bando.</p>
  ) : (
    <ul className="divide-y rounded-lg border bg-white">
      {compatibleClients.map((c) => (
        <li key={c.companyId} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-medium">{c.companyName}</p>
            <div className="mt-1"><MatchScoreBadge score={c.score.total} /></div>
          </div>
          {c.hasPractice ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Pratica in corso
            </span>
          ) : (
            <Link
              href={`/consulente/pratiche/new?grantId=${params.id}&clientId=${c.companyId}`}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Avvia
            </Link>
          )}
        </li>
      ))}
    </ul>
  )}
</section>
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter web exec tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/'(dashboard)'/consulente/bandi/'[id]'/page.tsx
git commit -m "feat(matching): show compatible clients section on consultant grant page"
```

---

## Task 18: New route `/consulente/clienti/[id]` with "Bandi compatibili" tab

**Files:**
- Create: `apps/web/app/(dashboard)/consulente/clienti/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { matchGrantsForCompany, getMatchExplanation } from "@/lib/actions/matching";
import { MatchCard } from "@/components/matching/match-card";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const consultantId = (session?.user as { id?: string } | undefined)?.id;
  if (!consultantId) redirect("/auth/login");

  const link = await prisma.consultantCompany.findFirst({
    where: { consultantId, companyId: params.id, status: "ACTIVE" },
    include: { company: { include: { companyProfile: true } } },
  });
  if (!link) notFound();

  const matches = await matchGrantsForCompany(params.id, { limit: 20 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{link.company.name}</h1>
        <p className="text-sm text-slate-500">
          {link.company.companyProfile?.atecoDescription} — {link.company.companyProfile?.region}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Bandi compatibili</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun bando compatibile per questo cliente.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {matches.map(({ grant, score }) => (
              <li key={grant.id}>
                <MatchCard
                  grant={{
                    id: grant.id,
                    title: grant.title,
                    issuingBody: grant.issuingBody,
                    maxAmount: grant.maxAmount == null ? null : Number(grant.maxAmount),
                    deadline: grant.deadline,
                  }}
                  score={score}
                  href={`/consulente/bandi/${grant.id}?clientId=${params.id}`}
                  fetchExplanation={async () => {
                    "use server";
                    const r = await getMatchExplanation(params.id, grant.id);
                    return { paragraph: r.paragraph };
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + run all tests**

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web test
```
Expected: clean + all matching/grants/onboarding tests passing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/'(dashboard)'/consulente/clienti/'[id]'/page.tsx
git commit -m "feat(matching): add /consulente/clienti/[id] with Bandi compatibili tab"
```

---

## Task 19: Manual smoke test + final verification

**Files:** None modified — verification only.

- [ ] **Step 1: Start the dev server**

```bash
pnpm --filter web dev
```
Wait until ready on `http://localhost:3000`.

- [ ] **Step 2: Run through the manual smoke checklist**

In a browser, log in as a company user with a completed profile, then verify:

1. `/azienda` — section "Bandi consigliati per te" is visible with up to 5 cards and color-banded badges.
2. `/azienda/bandi` — every grant card shows a match badge.
3. `/azienda/bandi/consigliati` — list ordered by score; AI paragraph appears under each card after a moment.
4. Refresh `/azienda/bandi/consigliati` — paragraph appears immediately (cache hit). Verify in server logs that no second OpenAI call is made.
5. Edit profile → change region → reload `/azienda/bandi/consigliati` → cache invalidated, paragraphs recomputed.

Log out, log in as a consultant with at least 2 active client links, then:

6. `/consulente` — table "Top opportunita clienti" populated, ordered by priority.
7. `/consulente/bandi/<grant-id>` — section "Tuoi clienti compatibili" lists clients with badges and CTA.
8. `/consulente/clienti/<company-id>` — tab "Bandi compatibili" lists scored grants for that client.
9. Click "Avvia" on a client without a practice → flows to existing practice creation route.

- [ ] **Step 3: Run full test suite once more**

```bash
pnpm --filter web test
pnpm --filter web exec tsc --noEmit
```
Expected: all tests pass, no type errors.

- [ ] **Step 4: Commit any final tweaks (if smoke uncovered issues)**

```bash
git add -A
git commit -m "chore(matching): smoke test fixes for MVP"
```

---

## Out of scope for this plan (already deferred to Phase 2)

Per the spec section 9 and the persisted memory `project_finanza_agevolata.md`:

- Cron job for nightly recompute
- Notifications "new matched grant"
- Match score based on practice history
- Consultant-specific ranking
- Excel export
- External CRM webhooks
- A/B testing on the 60/40 weights
- `MatchEvent` telemetry table (viewed/saved/applied)
- `MATCH_SEMANTIC_WEIGHT` env var (configurable weight at runtime)
- "Match parziale" badge when company data completeness is <60%

These remain in the project memory for future iteration once real consultant usage data is available.
