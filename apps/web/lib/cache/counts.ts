import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cacheTags } from "./keys";

export function getCachedCompanyCounts(userId: string) {
  return unstable_cache(
    async () => {
      const [practiceCount, missingDocs, rejectedDocs] = await Promise.all([
        prisma.practice.count({ where: { companyId: userId } }),
        prisma.practiceDocument.count({
          where: { practice: { companyId: userId }, status: "MISSING" },
        }),
        prisma.practiceDocument.count({
          where: { practice: { companyId: userId }, status: "REJECTED" },
        }),
      ]);
      return { practiceCount, missingDocs, rejectedDocs };
    },
    ["company-counts", userId],
    { revalidate: 30, tags: [cacheTags.counts(userId)] },
  )();
}
