import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GrantListCard } from "@/components/bandi/grant-list-card";

export default async function ConsulenteBandiPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [myGrants, publishedGrants] = await Promise.all([
    userId
      ? prisma.grant.findMany({
          where: { createdById: userId },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.grant.findMany({
      where: { status: "PUBLISHED", approvedByAdmin: true },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bandi</h1>
        <Link href="/consulente/bandi/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Proponi bando
        </Link>
      </div>

      {myGrants.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">I miei bandi proposti</h2>
          <ul className="space-y-2">
            {myGrants.map((g) => {
              const statusLabel = g.approvedByAdmin
                ? g.status === "PUBLISHED"
                  ? { text: "Pubblicato", cls: "bg-green-100 text-green-800" }
                  : g.status === "CLOSED"
                    ? { text: "Chiuso", cls: "bg-slate-200 text-slate-700" }
                    : { text: "Approvato", cls: "bg-blue-100 text-blue-800" }
                : { text: "In attesa di approvazione", cls: "bg-amber-100 text-amber-800" };
              return (
                <li key={g.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                  <div>
                    <Link href={`/consulente/bandi/${g.id}`} className="font-medium text-slate-900 hover:underline">
                      {g.title}
                    </Link>
                    <p className="text-xs text-slate-500">{g.issuingBody}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel.cls}`}>
                    {statusLabel.text}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Bandi pubblicati</h2>
        {publishedGrants.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun bando pubblicato.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publishedGrants.map((g) => (
              <GrantListCard key={g.id} grant={g} href={`/consulente/bandi/${g.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
