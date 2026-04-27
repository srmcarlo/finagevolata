import { describe, it, expect } from "vitest";
import {
  atecoMatches,
  computeRulesScore,
  combineScores,
  deriveChips,
} from "./matching";
import type { CompanySize } from "@prisma/client";

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

  it("returns sub when profile is a class and eligible is a bare division code", () => {
    expect(atecoMatches("62.01", ["62"])).toEqual({ matches: true, precision: "sub" });
  });

  it("returns sub when profile is a class and eligible is a group code", () => {
    expect(atecoMatches("62.01", ["62.0"])).toEqual({ matches: true, precision: "sub" });
  });

  it("returns parent when profile is a bare division and eligible is a subclass", () => {
    expect(atecoMatches("62", ["62.01.01"])).toEqual({ matches: true, precision: "parent" });
  });
});

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

  it("amount earns 5/20 (out of range) when annualRevenue is 0", () => {
    const r = computeRulesScore(
      { ...baseProfile, annualRevenue: 0 },
      baseGrant
    );
    expect(r.breakdown.amount).toBe(5);
  });

  it("ateco parent earns 20/30", () => {
    const r = computeRulesScore({ ...baseProfile, atecoCode: "62" }, baseGrant);
    expect(r.breakdown.ateco).toBe(20);
  });
});

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
  it("falls back to rulesScore when semanticScore is NaN", () => {
    expect(combineScores(80, NaN)).toBe(80);
  });
  it("clamps weight outside [0,1]", () => {
    expect(combineScores(100, 0, 1.5)).toBe(100);
    expect(combineScores(100, 0, -0.5)).toBe(0);
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
