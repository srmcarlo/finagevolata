import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { respondToInvitation } from "@/lib/actions/companies";
import { revalidatePath } from "next/cache";

export default async function InvitiPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const invitations = await prisma.consultantCompany.findMany({
    where: { companyId: userId },
    include: {
      consultant: {
        include: { consultantProfile: true },
      },
    },
    orderBy: { invitedAt: "desc" },
  });

  async function handleAccept(formData: FormData) {
    "use server";
    const invitationId = formData.get("invitationId") as string;
    await respondToInvitation(invitationId, true);
    revalidatePath("/azienda/inviti");
  }

  async function handleReject(formData: FormData) {
    "use server";
    const invitationId = formData.get("invitationId") as string;
    await respondToInvitation(invitationId, false);
    revalidatePath("/azienda/inviti");
  }

  const pending = invitations.filter((i) => i.status === "PENDING");
  const active = invitations.filter((i) => i.status === "ACTIVE");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">I miei Consulenti</h1>

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Inviti in attesa</h2>
          <div className="space-y-3">
            {pending.map((inv) => (
              <div key={inv.id} className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {inv.consultant.consultantProfile?.firmName || inv.consultant.name}
                  </p>
                  <p className="text-sm text-gray-500">{inv.consultant.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Invitato il {new Date(inv.invitedAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={handleAccept}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Accetta
                    </button>
                  </form>
                  <form action={handleReject}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                      Rifiuta
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active consultants */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Consulenti attivi</h2>
      {active.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Nessun consulente collegato.</p>
          <p className="text-xs text-gray-400 mt-1">Quando un consulente ti invita, vedrai l'invito qui.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Consulente / Studio</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Collegato dal</th>
              </tr>
            </thead>
            <tbody>
              {active.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {inv.consultant.consultantProfile?.firmName || inv.consultant.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{inv.consultant.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {inv.acceptedAt ? new Date(inv.acceptedAt).toLocaleDateString("it-IT") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
