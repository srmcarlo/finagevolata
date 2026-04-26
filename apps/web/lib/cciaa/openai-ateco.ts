import type { CciaaData, CciaaProvider } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `Sei esperto di codici ATECO 2007 italiani.
Dato il nome di un'azienda italiana e la sua forma giuridica, deduci il codice ATECO 2007 piu probabile (formato XX.XX o XX.XX.XX) e la descrizione ufficiale.
Se il nome e' generico e non hai abbastanza informazioni, restituisci un codice di settore generale.
Rispondi SEMPRE in JSON valido con esattamente questi campi: {"ateco_code": "...", "ateco_description": "...", "confidence": "high|medium|low"}.
Mai testo libero, solo JSON.`;

interface OpenAiResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface AtecoGuess {
  ateco_code: string;
  ateco_description: string;
  confidence: "high" | "medium" | "low";
}

export class OpenAiAtecoProvider implements CciaaProvider {
  private apiKey: string;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = (opts?.apiKey ?? process.env.OPENAI_API_KEY ?? "").trim();
    this.model = (opts?.model ?? process.env.OPENAI_ATECO_MODEL ?? "gpt-4o-mini").trim();
  }

  async lookup(vatNumber: string, hint?: Partial<CciaaData>): Promise<CciaaData | null> {
    if (!this.apiKey) {
      console.warn("[OpenAI ATECO] missing OPENAI_API_KEY");
      return null;
    }
    if (!hint?.companyName) {
      return null;
    }

    const userPrompt = [
      `Azienda: ${hint.companyName}`,
      hint.legalForm ? `Forma giuridica: ${hint.legalForm}` : null,
      hint.province ? `Provincia: ${hint.province}` : null,
      hint.region ? `Regione: ${hint.region}` : null,
      `P.IVA: ${vatNumber}`,
      "",
      "Restituisci il codice ATECO 2007 piu probabile in JSON.",
    ]
      .filter(Boolean)
      .join("\n");

    let res: Response;
    try {
      res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 200,
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      console.warn("[OpenAI ATECO] network error", err);
      return null;
    }

    if (!res.ok) {
      console.warn("[OpenAI ATECO] HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = (await res.json()) as OpenAiResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    let guess: AtecoGuess;
    try {
      guess = JSON.parse(content);
    } catch {
      console.warn("[OpenAI ATECO] invalid JSON:", content.slice(0, 200));
      return null;
    }

    if (!guess.ateco_code) return null;

    return {
      companyName: hint.companyName ?? "",
      legalForm: hint.legalForm ?? "",
      atecoCode: guess.ateco_code,
      atecoDescription: guess.ateco_description ?? "",
      province: hint.province ?? "",
      region: hint.region ?? "",
    };
  }
}
