import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConsultantProfileForm } from "./profile-form";

export default async function ConsultantProfiloPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const profile = await prisma.consultantProfile.findUnique({ where: { userId } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profilo Consulente</h1>
      <div className="rounded-lg border bg-white p-6">
        <ConsultantProfileForm profile={profile ? {
          firmName: profile.firmName || "",
          specializations: profile.specializations.join(", "),
          maxClients: profile.maxClients,
        } : {
          firmName: "",
          specializations: "",
          maxClients: 20,
        }} />
      </div>
    </div>
  );
}
