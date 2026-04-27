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
