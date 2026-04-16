// apps/web/lib/actions/rag.ts
"use server";

import { auth } from "@/lib/auth";
import { ingestGrantContent } from "@/lib/services/rag";

/**
 * Server Action per indicizzare il contenuto testuale di un bando.
 * Chiamata dall'Admin dopo aver incollato il testo del bando ufficiale.
 */
export async function indexGrantText(grantId: string, text: string) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user || role !== "ADMIN") {
    return { error: "Non autorizzato. Solo gli Admin possono indicizzare i bandi." };
  }

  if (!text || text.trim().length < 50) {
    return { error: "Il testo del bando è troppo corto. Incolla almeno un paragrafo." };
  }

  try {
    const result = await ingestGrantContent(grantId, text);
    return {
      success: true,
      message: `Bando indicizzato con successo! ${result.chunksCount} frammenti creati per la ricerca AI.`,
    };
  } catch (error: any) {
    console.error("[RAG] Errore indicizzazione:", error);
    return { error: `Errore durante l'indicizzazione: ${error.message}` };
  }
}
