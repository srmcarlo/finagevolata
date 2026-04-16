// apps/web/scripts/reindex-grants.ts
// Script per indicizzare tutti i bandi esistenti usando il nuovo modello AI

import { prisma } from "../lib/prisma";
import { ingestGrantContent } from "../lib/services/rag";

async function main() {
  console.log("🚀 Avvio re-indicizzazione bandi...");

  const grants = await prisma.grant.findMany();
  console.log(`Trovati ${grants.length} bandi da processare.`);

  for (const grant of grants) {
    try {
      console.log(`Sto indicizzando: ${grant.title}...`);
      
      // Se non abbiamo un testo bando completo, usiamo titolo + descrizione come base
      const content = `${grant.title}\n\n${grant.description}\n\nEnte: ${grant.issuingBody}\nTipo: ${grant.grantType}`;
      
      await ingestGrantContent(grant.id, content);
      console.log(`✅ ${grant.title} indicizzato con successo.`);
    } catch (error) {
      console.error(`❌ Errore su ${grant.title}:`, error);
    }
  }

  console.log("✨ Re-indicizzazione completata!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
