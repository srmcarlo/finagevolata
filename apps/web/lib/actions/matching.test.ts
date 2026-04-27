import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockProfileFindUnique = vi.fn();
const mockGrantsRaw = vi.fn();
const mockSimilarityRaw = vi.fn();
const mockConsultantCompanyFindFirst = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    companyProfile: { findUnique: (...a: any[]) => mockProfileFindUnique(...a) },
    consultantCompany: { findFirst: (...a: any[]) => mockConsultantCompanyFindFirst(...a) },
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
