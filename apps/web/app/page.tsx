import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role === "COMPANY") {
    // Check if company has completed onboarding
    const profile = await prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      redirect("/onboarding");
    }
    redirect("/azienda");
  }

  if (role === "CONSULTANT") redirect("/consulente");
  if (role === "ADMIN") redirect("/admin");

  redirect("/login");
}
