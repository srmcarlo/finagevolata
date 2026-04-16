// apps/web/app/api/chat/route.ts
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { searchGrantChunks } from "@/lib/services/rag";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, practiceId } = await req.json();

  // 1. Recupera il contesto della pratica (bando + azienda)
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      grant: {
        include: { documentRequirements: { include: { documentType: true } } },
      },
      company: { include: { companyProfile: true } },
    },
  });

  if (!practice) {
    return new Response("Practice not found", { status: 404 });
  }

  // 2. Prendi l'ultimo messaggio dell'utente per la ricerca RAG
  const lastMessage = messages[messages.length - 1]?.content || "";

  // 3. --- RAG: Cerca i chunk rilevanti dal vector database ---
  let ragContext = "";
  try {
    const chunks = await searchGrantChunks(practice.grantId, lastMessage, 4);
    if (chunks.length > 0) {
      ragContext = chunks.map((c) => c.content).join("\n\n---\n\n");
    }
  } catch (error) {
    // Se pgvector non è ancora configurato o non ci sono chunk, non blocchiamo
    console.warn("[RAG] Ricerca chunk fallita, uso solo i dati strutturati", error);
  }

  // 4. Costruisci il contesto strutturato (sempre disponibile, anche senza RAG)
  const docList = practice.grant.documentRequirements
    .map(
      (r: any) =>
        `- ${r.documentType.name} (${r.isRequired ? "Obbligatorio" : "Opzionale"})${r.notes ? ` — Note: ${r.notes}` : ""}`
    )
    .join("\n");

  const companyProfile = practice.company.companyProfile;
  const companyInfo = companyProfile
    ? `L'azienda è "${companyProfile.companyName}", settore ${companyProfile.atecoDescription} (ATECO ${companyProfile.atecoCode}), regione ${companyProfile.region}, dimensione ${companyProfile.employeeCount}.`
    : "Profilo aziendale non ancora completato.";

  // 5. System prompt arricchito con RAG + dati strutturati
  const systemPrompt = `Sei un assistente esperto in finanza agevolata italiana, specializzato nel bando "${practice.grant.title}".
Il tuo compito è aiutare l'azienda a capire cosa fare per completare con successo la domanda di contributo.

=== DATI DEL BANDO ===
Titolo: ${practice.grant.title}
Ente emittente: ${practice.grant.issuingBody}
Tipo: ${practice.grant.grantType}
${practice.grant.deadline ? `Scadenza: ${new Date(practice.grant.deadline).toLocaleDateString("it-IT")}` : "Scadenza: non specificata"}
${practice.grant.maxAmount ? `Importo massimo: €${Number(practice.grant.maxAmount).toLocaleString("it-IT")}` : ""}
Descrizione: ${practice.grant.description}

=== DOCUMENTI RICHIESTI ===
${docList || "Nessun documento configurato."}

=== PROFILO DELL'AZIENDA ===
${companyInfo}

${ragContext ? `=== ESTRATTI DAL TESTO UFFICIALE DEL BANDO ===\n${ragContext}` : ""}

=== ISTRUZIONI ===
- Rispondi in italiano, in modo chiaro e diretto.
- Cita le informazioni specifiche dal testo del bando quando disponibili.
- Se non sei sicuro di qualcosa, dillo chiaramente e suggerisci di verificare sul sito ufficiale o con il consulente.
- Fornisci risposte concise ma complete.
- Se ti chiedono dei documenti, elencali con i formati accettati.`;

  // 6. Genera la risposta in streaming
  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
