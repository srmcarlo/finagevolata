import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPractice } from "@/lib/actions/practices";

export default async function NewPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ grantId?: string; clientId?: string }>;
}) {
  const { grantId, clientId } = await searchParams;
  if (!grantId || !clientId) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId || role !== "CONSULTANT") redirect("/auth/login");

  const existing = await prisma.practice.findFirst({
    where: { consultantId: userId, companyId: clientId, grantId },
    select: { id: true },
  });
  if (existing) redirect(`/consulente/pratiche/${existing.id}`);

  const fd = new FormData();
  fd.set("grantId", grantId);
  fd.set("companyId", clientId);
  const result = await createPractice(fd);

  if (!("success" in result) || !result.success) {
    const message = "error" in result ? result.error : "Errore sconosciuto";
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Impossibile avviare pratica
        </h1>
        <p className="mt-2 text-sm text-red-600">{message}</p>
        <div className="mt-4 flex gap-4 text-sm">
          <Link href={`/consulente/bandi/${grantId}`} className="text-blue-600 hover:underline">
            ← Torna al bando
          </Link>
          <Link href="/consulente/clienti" className="text-blue-600 hover:underline">
            Vai ai clienti
          </Link>
        </div>
      </div>
    );
  }

  redirect(`/consulente/pratiche/${result.practiceId}`);
}
