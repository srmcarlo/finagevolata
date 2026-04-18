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
