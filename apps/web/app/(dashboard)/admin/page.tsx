import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [userCount, grantCount, practiceCount, pendingGrants] = await Promise.all([
    prisma.user.count(),
    prisma.grant.count({ where: { status: "PUBLISHED" } }),
    prisma.practice.count(),
    prisma.grant.count({ where: { approvedByAdmin: false, status: "DRAFT" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Utenti totali</p>
          <p className="text-3xl font-bold">{userCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Bandi attivi</p>
          <p className="text-3xl font-bold">{grantCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Pratiche totali</p>
          <p className="text-3xl font-bold">{practiceCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Bandi da approvare</p>
          <p className="text-3xl font-bold text-amber-600">{pendingGrants}</p>
        </div>
      </div>
    </div>
  );
}
