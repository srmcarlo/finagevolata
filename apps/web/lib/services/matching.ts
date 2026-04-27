export type AtecoPrecision = "exact" | "sub" | "parent" | "prefix" | "none";

function normalize(code: string): string {
  return code.trim().toUpperCase();
}

function division(code: string): string {
  return normalize(code).split(".")[0] ?? "";
}

// ATECO precision levels: exact = identical code; sub = profile is a descendant of eligible;
// parent = profile is an ancestor of eligible; prefix = same 2-digit division; none = no match.
// The OR-branch in sub/parent handles group-level codes (e.g. "62.0") where the decimal suffix
// is a single digit — "62.01".startsWith("62.0.") is false, so length-and-prefix catches it.
// Callers MUST pass real ATECO codes (normalized via validated dropdowns); malformed strings
// (e.g. "62.1" vs "62.10") can produce false positives in sub/parent detection.
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
