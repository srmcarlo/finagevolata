import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CompanyDashboard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const [practiceCount, missingDocs, rejectedDocs] = await Promise.all([
    prisma.practice.count({ where: { companyId: userId } }),
    prisma.practiceDocument.count({
      where: { practice: { companyId: userId }, status: "MISSING" },
    }),
    prisma.practiceDocument.count({
      where: { practice: { companyId: userId }, status: "REJECTED" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Azienda</h1>
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
    </div>
  );
}
