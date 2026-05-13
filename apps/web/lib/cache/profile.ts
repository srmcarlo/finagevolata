import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cacheTags } from "./keys";

export function getCachedCompanyProfile(userId: string) {
  return unstable_cache(
    () => prisma.companyProfile.findUnique({ where: { userId } }),
    ["company-profile", userId],
    { revalidate: 120, tags: [cacheTags.profile(userId)] },
  )();
}
