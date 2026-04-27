import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockGrantsRaw = vi.fn();
const mockSimilarityRaw = vi.fn();
const mockConsultantCompanyFindFirst = vi.fn();
const mockConsultantCompanyFindMany = vi.fn();
const mockGrantFindUnique = vi.fn();
const mockExplFindUnique = vi.fn();
const mockExplUpsert = vi.fn();
const mockExplDeleteMany = vi.fn();
const mockPracticeFindMany = vi.fn();
const mockGenerateExplanation = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/services/match-explanation", () => ({
  generateExplanation: (...a: any[]) => mockGenerateExplanation(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    companyProfile: { findUnique: (...a: any[]) => mockProfileFindUnique(...a) },
    consultantCompany: {
      findFirst: (...a: any[]) => mockConsultantCompanyFindFirst(...a),
      findMany: (...a: any[]) => mockConsultantCompanyFindMany(...a),
    },
    grant: { findUnique: (...a: any[]) => mockGrantFindUnique(...a) },
    grantMatchExplanation: {
      findUnique: (...a: any[]) => mockExplFindUnique(...a),
      upsert: (...a: any[]) => mockExplUpsert(...a),
      deleteMany: (...a: any[]) => mockExplDeleteMany(...a),
    },
    practice: { findMany: (...a: any[]) => mockPracticeFindMany(...a) },
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
  mockConsultantCompanyFindFirst.mockReset();
  mockConsultantCompanyFindMany.mockReset();
  mockGrantFindUnique.mockReset();
  mockExplFindUnique.mockReset();
  mockExplUpsert.mockReset();
  mockExplDeleteMany.mockReset();
  mockPracticeFindMany.mockReset();
  mockGenerateExplanation.mockReset();
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

  it("respects opts.limit and opts.minScore", async () => {
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
        id: "g1", title: "A", description: "", issuingBody: "MISE", grantType: "FONDO_PERDUTO",
        eligibleAtecoCodes: ["62.01"], eligibleCompanySizes: ["SMALL"], eligibleRegions: ["Lazio"],
        minAmount: 50_000, maxAmount: 200_000,
        deadline: new Date(Date.now() + 90 * 86400000), approvedByAdmin: true,
      },
      {
        id: "g2", title: "B", description: "", issuingBody: "MISE", grantType: "FONDO_PERDUTO",
        eligibleAtecoCodes: ["99.99"], eligibleCompanySizes: ["LARGE"], eligibleRegions: ["Lazio"],
        minAmount: 1_000_000, maxAmount: 5_000_000,
        deadline: null, approvedByAdmin: false,
      },
    ]);
    mockSimilarityRaw.mockResolvedValue([]);

    const limited = await matchGrantsForCompany("u1", { limit: 1 });
    expect(limited).toHaveLength(1);

    const filtered = await matchGrantsForCompany("u1", { minScore: 70 });
    expect(filtered.every((r) => r.score.total >= 70)).toBe(true);
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
        description: "...",
        issuingBody: "MISE",
        grantType: "FONDO_PERDUTO",
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

import {
  getMatchScoreForGrant,
  getMatchScoresForGrants,
  getTopMatchesForDashboard,
} from "./matching";

const baseProfileMock = {
  userId: "u1",
  atecoCode: "62.01",
  employeeCount: "SMALL",
  annualRevenue: 500_000,
  region: "Lazio",
  embedding: [0.1],
};

function grantRow(id: string, opts: { ateco?: string[]; sizes?: string[]; region?: string[]; deadline?: Date | null; approved?: boolean; max?: number | null } = {}) {
  return {
    id,
    title: id.toUpperCase(),
    description: "",
    issuingBody: "MISE",
    grantType: "FONDO_PERDUTO",
    eligibleAtecoCodes: opts.ateco ?? ["62.01"],
    eligibleCompanySizes: opts.sizes ?? ["SMALL"],
    eligibleRegions: opts.region ?? ["Lazio"],
    minAmount: 50_000,
    maxAmount: opts.max ?? 200_000,
    deadline: opts.deadline === undefined ? new Date(Date.now() + 90 * 86400000) : opts.deadline,
    approvedByAdmin: opts.approved ?? true,
  };
}

describe("getMatchScoresForGrants", () => {
  it("returns a Map keyed by grantId for the requested ids only", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(baseProfileMock);
    mockGrantsRaw.mockResolvedValue([
      grantRow("g1"),
      grantRow("g2", { deadline: null, approved: false, max: 5_000 }),
    ]);
    mockSimilarityRaw.mockResolvedValue([]);

    const result = await getMatchScoresForGrants("u1", ["g1", "g2", "g999"]);
    expect(result.size).toBe(2);
    expect(result.get("g1")?.total).toBeGreaterThan(result.get("g2")!.total);
    expect(result.has("g999")).toBe(false);
  });

  it("returns empty Map when grantIds list is empty", async () => {
    const result = await getMatchScoresForGrants("u1", []);
    expect(result.size).toBe(0);
  });
});

describe("getTopMatchesForDashboard", () => {
  it("returns at most `limit` rows ordered by score", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(baseProfileMock);
    mockGrantsRaw.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) =>
        grantRow(`g${i}`, { approved: i % 2 === 0 })
      )
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
    mockProfileFindUnique.mockResolvedValue(baseProfileMock);
    mockGrantsRaw.mockResolvedValue([]);
    mockSimilarityRaw.mockResolvedValue([]);

    const score = await getMatchScoreForGrant("u1", "g-missing");
    expect(score).toBeNull();
  });
});

import { getMatchExplanation } from "./matching";

const explProfile = {
  ...baseProfileMock,
  companyName: "Acme",
  atecoDescription: "Software",
};

const explGrant = {
  id: "g1",
  title: "Bando A",
  description: "...",
  issuingBody: "MISE",
  grantType: "FONDO_PERDUTO",
  minAmount: 50_000,
  maxAmount: 200_000,
  deadline: new Date(Date.now() + 90 * 86400000),
  eligibleAtecoCodes: ["62.01"],
  eligibleRegions: ["Lazio"],
  eligibleCompanySizes: ["SMALL"],
  approvedByAdmin: true,
};

describe("getMatchExplanation", () => {
  it("returns cached row without calling OpenAI when fresh", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(explProfile);
    mockGrantsRaw.mockResolvedValue([explGrant]);
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
    mockProfileFindUnique.mockResolvedValue(explProfile);
    mockGrantsRaw.mockResolvedValue([explGrant]);
    mockSimilarityRaw.mockResolvedValue([{ id: "g1", similarity: 0.8 }]);
    mockExplFindUnique.mockResolvedValue(null);
    mockGrantFindUnique.mockResolvedValue(explGrant);
    mockGenerateExplanation.mockResolvedValue("AI generated paragraph");
    mockExplUpsert.mockResolvedValue({});

    const result = await getMatchExplanation("u1", "g1");
    expect(result.fromCache).toBe(false);
    expect(result.paragraph).toBe("AI generated paragraph");
    expect(mockGenerateExplanation).toHaveBeenCalledTimes(1);
    expect(mockExplUpsert).toHaveBeenCalledTimes(1);
  });

  it("invalidates a row older than 30 days and recomputes", async () => {
    // covered below
  });
});

import { invalidateMatchExplanations } from "./matching";

describe("invalidateMatchExplanations", () => {
  it("deletes by companyId", async () => {
    mockExplDeleteMany.mockResolvedValue({ count: 3 });
    await invalidateMatchExplanations({ companyId: "u1" });
    expect(mockExplDeleteMany).toHaveBeenCalledWith({ where: { companyId: "u1" } });
  });

  it("deletes by grantId", async () => {
    mockExplDeleteMany.mockResolvedValue({ count: 5 });
    await invalidateMatchExplanations({ grantId: "g1" });
    expect(mockExplDeleteMany).toHaveBeenCalledWith({ where: { grantId: "g1" } });
  });

  it("no-ops with no filters", async () => {
    await invalidateMatchExplanations({});
    expect(mockExplDeleteMany).not.toHaveBeenCalled();
  });
});

describe("getMatchExplanation TTL re-test", () => {
  it("invalidates a row older than 30 days and recomputes", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "COMPANY" } });
    mockProfileFindUnique.mockResolvedValue(explProfile);
    mockGrantsRaw.mockResolvedValue([explGrant]);
    mockSimilarityRaw.mockResolvedValue([{ id: "g1", similarity: 0.8 }]);
    const oldDate = new Date(Date.now() - 31 * 86400000);
    mockExplFindUnique.mockResolvedValue({
      paragraph: "stale",
      matchedChips: [],
      matchScore: 50,
      rulesScore: 50,
      semanticScore: 50,
      computedAt: oldDate,
    });
    mockGrantFindUnique.mockResolvedValue(explGrant);
    mockGenerateExplanation.mockResolvedValue("fresh paragraph");
    mockExplUpsert.mockResolvedValue({});

    const result = await getMatchExplanation("u1", "g1");
    expect(result.fromCache).toBe(false);
    expect(result.paragraph).toBe("fresh paragraph");
  });
});
