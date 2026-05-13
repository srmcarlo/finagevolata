import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  StatsGridSkeleton,
  OpportunitiesTableSkeleton,
} from "@/components/skeletons";
import { ConsultantStatsGrid } from "./_sections/consultant-stats-grid";
import { TopOpportunities } from "./_sections/top-opportunities";

export default async function ConsultantDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Consulente</h1>

      <Suspense fallback={<StatsGridSkeleton />}>
        <ConsultantStatsGrid userId={userId} />
      </Suspense>

      <Suspense fallback={<OpportunitiesTableSkeleton />}>
        <TopOpportunities userId={userId} />
      </Suspense>
    </div>
  );
}
