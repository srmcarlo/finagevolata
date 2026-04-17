import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WelcomeCompanyStep } from "./steps/welcome-company";
import { VatProfileStep } from "./steps/vat-profile";
import { InterestsStep } from "./steps/interests";

interface PageProps {
  searchParams: Promise<{ step?: string }>;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { step: stepRaw } = await searchParams;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login");
  if (user.role === "CONSULTANT") redirect("/onboarding/consulente");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { companyProfile: true },
  });

  if (dbUser?.onboardingCompletedAt) redirect("/azienda");

  const requested = Number(stepRaw);
  const inferred = dbUser?.companyProfile ? 3 : 1;
  const step = [1, 2, 3].includes(requested) ? requested : inferred;

  if (step === 1) return <WelcomeCompanyStep />;
  if (step === 2) return <VatProfileStep />;
  return <InterestsStep />;
}
