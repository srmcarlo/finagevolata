import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  InvitationsBannerSkeleton,
  StatsGridSkeleton,
  TopMatchesSkeleton,
} from "@/components/skeletons";
import { PendingInvitations } from "./_sections/pending-invitations";
import { StatsGrid } from "./_sections/stats-grid";
import { TopMatches } from "./_sections/top-matches";

export default async function CompanyDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  // Profile check stays upfront — required to gate onboarding redirect.
  const profile = await prisma.companyProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) redirect("/onboarding");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Azienda</h1>

      <Suspense fallback={<InvitationsBannerSkeleton />}>
        <PendingInvitations userId={userId} />
      </Suspense>

      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid userId={userId} />
      </Suspense>

      <Suspense fallback={<TopMatchesSkeleton />}>
        <TopMatches userId={userId} />
      </Suspense>
    </div>
  );
}
