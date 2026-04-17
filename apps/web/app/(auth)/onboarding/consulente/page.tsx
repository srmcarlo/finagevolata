import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WelcomeConsultantStep } from "./steps/welcome-consultant";
import { StudioStep } from "./steps/studio";
import { FirstClientStep } from "./steps/first-client";

interface PageProps {
  searchParams: Promise<{ step?: string }>;
}

export default async function ConsultantOnboardingPage({ searchParams }: PageProps) {
  const { step: stepRaw } = await searchParams;
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) redirect("/login");
  if (user.role !== "CONSULTANT") redirect("/onboarding");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { consultantProfile: true },
  });

  if (dbUser?.onboardingCompletedAt) redirect("/consulente");

  const requested = Number(stepRaw);
  const inferred = dbUser?.consultantProfile ? 3 : 1;
  const step = [1, 2, 3].includes(requested) ? requested : inferred;

  if (step === 1) return <WelcomeConsultantStep />;
  if (step === 2) return <StudioStep />;
  return <FirstClientStep />;
}
