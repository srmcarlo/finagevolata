import { prisma } from "@/lib/prisma";

export default async function AdminUtentiPage() {
  const users = await prisma.user.findMany({
    include: {
      companyProfile: true,
      consultantProfile: true,
      _count: {
        select: {
          practicesAsConsultant: true,
          practicesAsCompany: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestione Utenti</h1>
      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ruolo</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azienda/Studio</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Pratiche</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Registrato</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    user.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    user.role === "CONSULTANT" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {user.role === "ADMIN" ? "Admin" : user.role === "CONSULTANT" ? "Consulente" : "Azienda"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.companyProfile?.companyName || user.consultantProfile?.firmName || "\u2014"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {user._count.practicesAsConsultant + user._count.practicesAsCompany}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
