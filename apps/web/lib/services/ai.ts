// apps/web/lib/services/ai.ts
// Re-export centralizzato dei servizi AI
// Il servizio RAG è ora il cuore dell'intelligenza artificiale del portale

export { ingestGrantContent, searchGrantChunks, semanticMatchGrants } from "./rag";

// Alias per compatibilità con le action esistenti
export { ingestGrantContent as indexGrant } from "./rag";
export { semanticMatchGrants as findSemanticMatches } from "./rag";
