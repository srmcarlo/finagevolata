import { describe, it, expect, vi, beforeEach } from "vitest";

const mockComputeMatchesForCompany = vi.fn();
const mockUnstableCache = vi.fn();

vi.mock("@/lib/actions/matching", () => ({
  _computeMatchesForCompany: (...a: any[]) => mockComputeMatchesForCompany(...a),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: any, key: any, opts: any) => {
    mockUnstableCache(fn, key, opts);
    return fn;
  },
}));

import { getCachedTopMatches } from "./matches";

describe("getCachedTopMatches", () => {
  beforeEach(() => {
    mockComputeMatchesForCompany.mockReset();
    mockUnstableCache.mockReset();
  });

  it("wraps _computeMatchesForCompany with unstable_cache using a per-company key and tag", async () => {
    mockComputeMatchesForCompany.mockResolvedValue([]);
    await getCachedTopMatches("company-1", 5);

    expect(mockUnstableCache).toHaveBeenCalledTimes(1);
    const [, key, opts] = mockUnstableCache.mock.calls[0];
    expect(key).toEqual(["top-matches", "company-1", "5"]);
    expect(opts.revalidate).toBe(60);
    expect(opts.tags).toEqual(["matches:company-1"]);
  });

  it("delegates to _computeMatchesForCompany with the right args", async () => {
    mockComputeMatchesForCompany.mockResolvedValue([{ grant: { id: "g1" }, score: { total: 0.9 } }]);
    const result = await getCachedTopMatches("company-2", 3);

    expect(mockComputeMatchesForCompany).toHaveBeenCalledWith("company-2", { limit: 3 });
    expect(result).toEqual([{ grant: { id: "g1" }, score: { total: 0.9 } }]);
  });
});
