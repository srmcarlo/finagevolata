import { getCachedCompanyCounts } from "@/lib/cache/counts";

export async function StatsGrid({ userId }: { userId: string }) {
  const { practiceCount, missingDocs, rejectedDocs } = await getCachedCompanyCounts(userId);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Pratiche attive</p>
        <p className="text-3xl font-bold">{practiceCount}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Documenti mancanti</p>
        <p className="text-3xl font-bold text-amber-600">{missingDocs}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-gray-500">Documenti rifiutati</p>
        <p className="text-3xl font-bold text-red-600">{rejectedDocs}</p>
      </div>
    </div>
  );
}
