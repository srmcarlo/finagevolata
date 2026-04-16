// apps/web/lib/services/rag.ts
// Servizio RAG (Retrieval-Augmented Generation) per FinAgevolata
// Gestisce: ingestion PDF/testo bandi → chunking → embedding → pgvector

import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { prisma } from "@/lib/prisma";

const embeddingModel = google.embedding("text-embedding-004");

// ─── CHUNKING ────────────────────────────────────────────────────────────
// Divide il testo del bando in chunk sovrapposti per migliorare la ricerca

function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(" ");
    if (chunk.trim().length > 20) {
      chunks.push(chunk.trim());
    }
    start += chunkSize - overlap;
  }

  return chunks;
}

// ─── EMBEDDING ───────────────────────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text.replace(/\n/g, " ").substring(0, 8000), // Limita lunghezza
  });
  return embedding;
}

// ─── INGESTION ───────────────────────────────────────────────────────────
// Indicizza il contenuto testuale di un bando nel vector database

export async function ingestGrantContent(grantId: string, rawText: string) {
  // 1. Rimuovi chunk esistenti per re-indicizzazione
  await prisma.grantChunk.deleteMany({ where: { grantId } });

  // 2. Crea embedding del bando completo (per matching semantico)
  const grant = await prisma.grant.findUnique({ where: { id: grantId } });
  if (!grant) throw new Error("Bando non trovato");

  const summaryText = `${grant.title}. ${grant.description}. Bando ${grant.grantType} dell'ente ${grant.issuingBody}.`;
  const grantEmbedding = await generateEmbedding(summaryText);

  await prisma.$executeRaw`
    UPDATE grants SET embedding = ${grantEmbedding}::vector WHERE id = ${grantId}
  `;

  // 3. Chunking del testo completo
  const chunks = chunkText(rawText);
  console.log(`[RAG] Indicizzazione bando "${grant.title}": ${chunks.length} chunk`);

  // 4. Per ogni chunk: genera embedding e salva
  for (const content of chunks) {
    const chunkEmbedding = await generateEmbedding(content);

    // Crea il GrantChunk senza embedding (Prisma non supporta vector nel create)
    const chunk = await prisma.grantChunk.create({
      data: { grantId, content },
    });

    // Aggiorna l'embedding via SQL grezzo
    await prisma.$executeRaw`
      UPDATE grant_chunks SET embedding = ${chunkEmbedding}::vector WHERE id = ${chunk.id}
    `;
  }

  return { success: true, chunksCount: chunks.length };
}

// ─── RICERCA RAG ─────────────────────────────────────────────────────────
// Cerca i chunk più rilevanti per una domanda dell'utente

export async function searchGrantChunks(
  grantId: string,
  query: string,
  limit = 4
): Promise<{ content: string; similarity: number }[]> {
  const queryEmbedding = await generateEmbedding(query);

  const results: any[] = await prisma.$queryRaw`
    SELECT content, 1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM grant_chunks
    WHERE "grantId" = ${grantId}
    ORDER BY embedding <=> ${queryEmbedding}::vector ASC
    LIMIT ${limit}
  `;

  return results;
}

// ─── MATCHING SEMANTICO ──────────────────────────────────────────────────
// Trova i bandi più rilevanti per un profilo aziendale

export async function semanticMatchGrants(
  companyId: string,
  limit = 5
): Promise<{ id: string; title: string; description: string; similarity: number }[]> {
  const profile = await prisma.companyProfile.findUnique({
    where: { userId: companyId },
  });
  if (!profile) return [];

  const profileText = `Azienda ${profile.companyName}, settore ${profile.atecoDescription} (codice ATECO ${profile.atecoCode}), regione ${profile.region}, dimensione ${profile.employeeCount}`;
  const profileEmbedding = await generateEmbedding(profileText);

  // Aggiorna embedding dell'azienda
  await prisma.$executeRaw`
    UPDATE company_profiles SET embedding = ${profileEmbedding}::vector WHERE id = ${profile.id}
  `;

  const matches: any[] = await prisma.$queryRaw`
    SELECT id, title, description,
           1 - (embedding <=> ${profileEmbedding}::vector) as similarity
    FROM grants
    WHERE embedding IS NOT NULL AND status = 'PUBLISHED'
    ORDER BY embedding <=> ${profileEmbedding}::vector ASC
    LIMIT ${limit}
  `;

  return matches;
}
