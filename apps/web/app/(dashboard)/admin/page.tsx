import { Suspense } from "react";
import { AdminCountsSkeleton } from "@/components/skeletons";
import { AdminCounts } from "./_sections/admin-counts";

export default function AdminOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Dashboard Admin</h1>
      <Suspense fallback={<AdminCountsSkeleton />}>
        <AdminCounts />
      </Suspense>
    </div>
  );
}
