// apps/web/lib/services/ai-validator.ts
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase";

const aiValidatorSchema = z.object({
  isValid: z.boolean().describe("Se true, il documento sembra corretto e rispetta i requisiti. Se false, c'e' un problema."),
  notes: z.string().describe("Motivazione dettagliata (in italiano) del perche' e' valido o meno. Massimo 3 frasi."),
});

/**
 * Scarica il file da Supabase, lo invia a Gemini multimodal e restituisce il risultato della validazione formale.
 */
export async function validateDocumentWithAI(
  filePath: string,
  documentTypeName: string,
  companyName: string
): Promise<{ isValid: boolean; notes: string }> {
  try {
    const supabase = createServerSupabase();

    // 1. Usa createSignedUrl per ottenere un URL temporaneo sicuro
    const { data: signedData, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 300);

    if (error || !signedData?.signedUrl) {
      throw new Error(`Errore generazione URL sicuro per AI: ${error?.message}`);
    }

    // 2. Scarica il file per inviarlo come buffer (più stabile per lo schema ModelMessage)
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("documents")
      .download(filePath);

    if (downloadError || !fileBlob) {
      throw new Error(`Errore download file per AI: ${downloadError?.message}`);
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Determina il mime type
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    let mimeType = "application/pdf";
    if (ext === "png") mimeType = "image/png";
    else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";

    const isImage = mimeType.startsWith("image/");

    // 3. Richiama Gemini utilizzando il formato corretto per lo schema
    const { object } = await generateObject({
      model: google("gemini-1.5-pro"), 
      schema: aiValidatorSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Agisci come un revisore esperto di Finanza Agevolata italiana. 
Devi verificare questo documento appena caricato da un'azienda.
- Tipo documentale richiesto: "${documentTypeName}"
- Nome dell'azienda intestataria: "${companyName}"

REGOLE DI VALIDAZIONE:
1. Il documento allegato è coerente con la tipologia richiesta (${documentTypeName})?
2. Si fa riferimento all'azienda "${companyName}"?
3. Il documento appare valido e leggibile?

Restituisci l'esito della validazione.`
            },
            isImage
              ? { type: "image" as const, image: uint8Array, mediaType: mimeType }
              : { type: "file" as const, data: uint8Array, mediaType: mimeType }
          ],
        },
      ],
    });

    return object;
  } catch (error: any) {
    console.error("[AI-Validator] Errore validazione automatica del file:", error);
    return {
      isValid: false,
      notes: `Errore tecnico: ${error?.message || "Sconosciuto"}. Verifica i log del server.`,
    };
  }
}
