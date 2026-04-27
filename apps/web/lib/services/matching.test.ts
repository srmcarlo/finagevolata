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
