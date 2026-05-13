import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cacheTags } from "./keys";

export function getCachedPublishedGrants() {
  return unstable_cache(
    () =>
      prisma.grant.findMany({
        where: { status: "PUBLISHED", approvedByAdmin: true },
        orderBy: { deadline: "asc" },
      }),
    ["grants-published"],
    { revalidate: 300, tags: [cacheTags.grantsPublished()] },
  )();
}
