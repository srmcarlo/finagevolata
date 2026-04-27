import type { CompanySize } from "@prisma/client";

// ATECO precision levels: exact = identical code; sub = profile is a descendant of eligible;
// parent = profile is an ancestor of eligible; prefix = same 2-digit division; none = no match.
// The OR-branch in sub/parent handles group-level codes (e.g. "62.0") where the decimal suffix
// is a single digit — "62.01".startsWith("62.0.") is false, so length-and-prefix catches it.
// Callers MUST pass real ATECO codes (normalized via validated dropdowns); malformed strings
// (e.g. "62.1" vs "62.10") can produce false positives in sub/parent detection.
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
  if (maxAmount == null || annualRevenue == null) return 10; // neutral per spec
  if (annualRevenue <= 0) return 5; // out of range — protects against div-by-zero
  const ratio = maxAmount / annualRevenue;
  if (ratio >= 0.1 && ratio <= 1.0) return 20;
  return 5;
}

function deadlinePoints(deadline: Date | null, now: number = Date.now()): number {
  if (!deadline) return 0;
  const days = Math.floor((deadline.getTime() - now) / (24 * 60 * 60 * 1000));
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
    minAmount: number | null; // reserved for future lower-bound check
    maxAmount: number | null;
    deadline: Date | null;
    approvedByAdmin: boolean;
  }
): { score: number; breakdown: MatchScoreBreakdown } {
  const now = Date.now();
  const { precision } = atecoMatches(profile.atecoCode, grant.eligibleAtecoCodes);
  const breakdown: MatchScoreBreakdown = {
    ateco: atecoPoints(precision),
    size: sizeAdjacency(profile.employeeCount, grant.eligibleCompanySizes),
    amount: amountPoints(grant.maxAmount, profile.annualRevenue),
    deadline: deadlinePoints(grant.deadline, now),
    approval: grant.approvedByAdmin ? 10 : 0,
  };
  const score = breakdown.ateco + breakdown.size + breakdown.amount + breakdown.deadline + breakdown.approval;
  return { score, breakdown };
}
