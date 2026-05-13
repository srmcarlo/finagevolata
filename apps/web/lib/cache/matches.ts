import { unstable_cache } from "next/cache";
import { getTopMatchesForDashboard } from "@/lib/actions/matching";
import { cacheTags } from "./keys";

export function getCachedTopMatches(companyId: string, limit: number) {
  return unstable_cache(
    () => getTopMatchesForDashboard(companyId, limit),
    ["top-matches", companyId, String(limit)],
    { revalidate: 60, tags: [cacheTags.matches(companyId)] },
  )();
}
