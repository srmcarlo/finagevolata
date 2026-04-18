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
