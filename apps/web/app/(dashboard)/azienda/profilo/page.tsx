import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export default async function ProfiloPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const profile = await prisma.companyProfile.findUnique({ where: { userId } });
  if (!profile) redirect("/onboarding");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profilo Aziendale</h1>
      <div className="rounded-lg border bg-white p-6">
        <ProfileForm profile={{
          vatNumber: profile.vatNumber,
          companyName: profile.companyName,
          legalForm: profile.legalForm,
          atecoCode: profile.atecoCode,
          atecoDescription: profile.atecoDescription,
          province: profile.province,
          region: profile.region,
          employeeCount: profile.employeeCount,
        }} />
      </div>
    </div>
  );
}
