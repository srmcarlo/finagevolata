import { MockCciaaProvider } from "./mock";
import type { CciaaProvider } from "./types";

export type { CciaaData, CciaaProvider } from "./types";

let cached: CciaaProvider | null = null;

export function getCciaaProvider(): CciaaProvider {
  if (cached) return cached;
  const kind = process.env.CCIAA_PROVIDER ?? "mock";
  switch (kind) {
    case "mock":
    default:
      cached = new MockCciaaProvider();
  }
  return cached;
}
