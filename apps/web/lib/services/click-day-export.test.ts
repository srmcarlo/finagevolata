import { describe, it, expect } from "vitest";
import { buildClickDayEmailText, computeLinkExpirySeconds } from "./click-day-export";

const SEVEN_DAYS = 7 * 86400;
const ONE_HOUR = 3600;

describe("computeLinkExpirySeconds", () => {
  const now = new Date("2026-05-05T10:00:00Z");

  it("returns 7 days when clickDayDate is null", () => {
    expect(computeLinkExpirySeconds(null, now)).toBe(SEVEN_DAYS);
  });

  it("returns clickDayDate + 24h delta when within bounds", () => {
    const clickDayDate = new Date("2026-05-08T10:00:00Z"); // +3 days
    const expected = 3 * 86400 + 86400; // 4 days in seconds
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(expected);
  });

  it("clamps to 7 days max", () => {
    const clickDayDate = new Date("2026-06-30T10:00:00Z"); // far future
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(SEVEN_DAYS);
  });

  it("clamps to 1 hour min when clickDayDate is in the past", () => {
    const clickDayDate = new Date("2026-05-04T10:00:00Z"); // -1 day
    expect(computeLinkExpirySeconds(clickDayDate, now)).toBe(ONE_HOUR);
  });
});

describe("buildClickDayEmailText", () => {
  const baseInput = {
    grant: {
      title: "INAIL ISI 2026",
      issuingBody: "INAIL",
      clickDayDate: new Date("2026-06-15T09:00:00Z"),
    },
    company: {
      companyName: "Acme Srl",
      vatNumber: "12345678901",
      legalForm: "SRL",
      atecoCode: "62.01",
      atecoDescription: "Produzione di software",
      region: "Lombardia",
      province: "MI",
    },
    documents: [
      { name: "Visura Camerale", url: "https://signed/visura" },
      { name: "DURC", url: "https://signed/durc" },
    ],
    consultant: { name: "Mario Rossi", email: "mario@studio.it" },
    notes: "Priorità alta",
    linkExpiry: new Date("2026-06-16T09:00:00Z"),
  };

  it("includes grant title and issuing body", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("INAIL ISI 2026");
    expect(text).toContain("INAIL");
  });

  it("includes company anagraphics", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("Acme Srl");
    expect(text).toContain("12345678901");
    expect(text).toContain("62.01");
    expect(text).toContain("Produzione di software");
    expect(text).toContain("Lombardia");
  });

  it("lists every document with its presigned URL", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("Visura Camerale: https://signed/visura");
    expect(text).toContain("DURC: https://signed/durc");
  });

  it("includes consultant contact", () => {
    const text = buildClickDayEmailText(baseInput);
    expect(text).toContain("Mario Rossi");
    expect(text).toContain("mario@studio.it");
  });

  it("includes notes when provided", () => {
    expect(buildClickDayEmailText(baseInput)).toContain("Priorità alta");
  });

  it("uses dash placeholder when notes are empty", () => {
    const text = buildClickDayEmailText({ ...baseInput, notes: "" });
    expect(text).toMatch(/NOTE —\n—/);
  });

  it("falls back to 'Da definire' when clickDayDate is null", () => {
    const text = buildClickDayEmailText({
      ...baseInput,
      grant: { ...baseInput.grant, clickDayDate: null },
    });
    expect(text).toContain("Da definire");
  });
});
