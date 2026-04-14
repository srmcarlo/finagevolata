import { auth } from "@/lib/auth";
import { getMatchingGrants } from "@/lib/actions/grants";
import { GrantCard } from "@/components/grant-card";

export default async function CompanyGrantsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const grants = await getMatchingGrants(userId) as any[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bandi Compatibili</h1>
      {grants.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Nessun bando compatibile con il tuo profilo aziendale.</p>
          <p className="text-xs text-gray-400 mt-2">Assicurati di aver completato il profilo aziendale con codice ATECO, regione e dimensione.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {grants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}
    </div>
  );
}
