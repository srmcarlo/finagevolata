import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ConsultantDashboard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const [clientCount, practiceCount, pendingDocs] = await Promise.all([
    prisma.consultantCompany.count({ where: { consultantId: userId, status: "ACTIVE" } }),
    prisma.practice.count({ where: { consultantId: userId } }),
    prisma.practiceDocument.count({
      where: {
        practice: { consultantId: userId },
        status: "UPLOADED",
      },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Consulente</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Clienti attivi</p>
          <p className="text-3xl font-bold">{clientCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Pratiche</p>
          <p className="text-3xl font-bold">{practiceCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Documenti da revisionare</p>
          <p className="text-3xl font-bold">{pendingDocs}</p>
        </div>
      </div>
    </div>
  );
}
