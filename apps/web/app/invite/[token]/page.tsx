import { prisma } from "@/lib/prisma";
import { AcceptForm } from "./accept-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const invite = await prisma.clientInvite.findUnique({
    where: { token },
    include: { consultant: { select: { name: true } } },
  });

  const invalid =
    !invite || invite.status !== "PENDING" || invite.expiresAt.getTime() < Date.now();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-white px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {invalid ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Invito non valido o scaduto.</h1>
            <p className="mt-2 text-sm text-slate-600">
              Chiedi al tuo consulente di inviartene uno nuovo.
            </p>
            <a
              href="/register"
              className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:underline"
            >
              Oppure registrati normalmente →
            </a>
          </div>
        ) : (
          <>
            <h1 className="mb-6 text-2xl font-bold text-slate-900">Crea il tuo account</h1>
            <AcceptForm
              token={token}
              email={invite!.email}
              consultantName={invite!.consultant.name ?? "Il tuo consulente"}
            />
          </>
        )}
      </div>
    </div>
  );
}
