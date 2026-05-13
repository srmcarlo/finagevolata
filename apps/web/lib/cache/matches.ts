import { unstable_cache } from "next/cache";
import { _computeMatchesForCompany } from "@/lib/actions/matching";
import { cacheTags } from "./keys";

// Callers MUST authorize the companyId before invoking (e.g. page-level `auth()`
// + redirect). The cached function cannot call `auth()` itself because
// `unstable_cache` forbids reading cookies inside its callback.
export function getCachedTopMatches(companyId: string, limit: number) {
  return unstable_cache(
    () => _computeMatchesForCompany(companyId, { limit }),
    ["top-matches", companyId, String(limit)],
    { revalidate: 60, tags: [cacheTags.matches(companyId)] },
  )();
}
