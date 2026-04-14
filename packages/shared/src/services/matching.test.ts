import { describe, it, expect } from "vitest";
import { isGrantEligible } from "./matching";

const baseCompany = {
  atecoCode: "28.99",
  region: "Lombardia",
  employeeCount: "SMALL" as const,
};

const baseGrant = {
  eligibleAtecoCodes: [] as string[],
  eligibleRegions: [] as string[],
  eligibleCompanySizes: [] as string[],
  status: "PUBLISHED" as const,
  deadline: new Date(Date.now() + 86400000).toISOString(),
};

describe("isGrantEligible", () => {
  it("matches when grant has no restrictions (empty arrays = all eligible)", () => {
    expect(isGrantEligible(baseGrant, baseCompany)).toBe(true);
  });

  it("matches when ATECO code is in eligible list", () => {
    const grant = { ...baseGrant, eligibleAtecoCodes: ["28.99", "29.10"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("matches ATECO prefix (28.99 matches 28)", () => {
    const grant = { ...baseGrant, eligibleAtecoCodes: ["28"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("rejects when ATECO code is not in eligible list", () => {
    const grant = { ...baseGrant, eligibleAtecoCodes: ["10.11", "20.30"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("matches when region is in eligible list", () => {
    const grant = { ...baseGrant, eligibleRegions: ["Lombardia", "Piemonte"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("rejects when region is not in eligible list", () => {
    const grant = { ...baseGrant, eligibleRegions: ["Sicilia"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("matches when company size is in eligible list", () => {
    const grant = { ...baseGrant, eligibleCompanySizes: ["MICRO", "SMALL"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("rejects when company size is not in eligible list", () => {
    const grant = { ...baseGrant, eligibleCompanySizes: ["LARGE"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("rejects expired grants", () => {
    const grant = { ...baseGrant, deadline: new Date("2020-01-01").toISOString() };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("rejects non-published grants", () => {
    const grant = { ...baseGrant, status: "DRAFT" as const };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("accepts grants with no deadline", () => {
    const grant = { ...baseGrant, deadline: null };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });
});
