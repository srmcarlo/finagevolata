import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function PendingInvitations({ userId }: { userId: string }) {
  const pendingInvitations = await prisma.consultantCompany.findMany({
    where: { companyId: userId, status: "PENDING" },
    include: { consultant: { include: { consultantProfile: true } } },
  });

  if (pendingInvitations.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-blue-800">
            Hai {pendingInvitations.length} invit{pendingInvitations.length === 1 ? "o" : "i"} in attesa
          </h2>
          <div className="mt-2 space-y-1">
            {pendingInvitations.map((inv) => (
              <p key={inv.id} className="text-sm text-blue-700">
                <span className="font-medium">
                  {inv.consultant.consultantProfile?.firmName || inv.consultant.name}
                </span>{" "}
                ({inv.consultant.email}) ti ha invitato a collaborare
              </p>
            ))}
          </div>
        </div>
        <Link
          href="/azienda/inviti"
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Rispondi agli inviti
        </Link>
      </div>
    </div>
  );
}
