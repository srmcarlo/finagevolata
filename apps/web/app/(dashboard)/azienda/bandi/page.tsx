import { auth } from "@/lib/auth";
import { getMatchingGrants, getAISemanticMatches } from "@/lib/actions/grants";
import { GrantCard } from "@/components/grant-card";

export default async function CompanyGrantsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const [grants, aiGrants] = await Promise.all([
    getMatchingGrants(userId),
    getAISemanticMatches(userId)
  ]) as [any[], any[]];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bandi Compatibili</h1>
      {grants.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">Nessun bando compatibile con il tuo profilo aziendale.</p>
          <p className="text-xs text-gray-400 mt-2">Assicurati di aver completato il profilo aziendale con codice ATECO, regione e dimensione.</p>
        </div>
      ) : (
        <div className="grid gap-4 mb-10">
          {grants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}

      {aiGrants.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            Consigliati dall'AI 
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Beta</span>
          </h2>
          <div className="grid gap-4 opacity-90">
             {aiGrants.map((grant) => (
               <div key={grant.id} className="relative">
                 <div className="absolute -top-2 -right-2 z-10 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-sm">
                   MATCH: {Math.round(grant.similarity * 100)}%
                 </div>
                 <GrantCard grant={grant} />
               </div>
             ))}
          </div>
        </>
      )}
    </div>
  );
}
