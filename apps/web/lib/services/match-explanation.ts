const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT =
  "Sei consulente di finanza agevolata. Spiega in 2-3 frasi italiane perche il bando e adatto all'azienda. Tono diretto, no markdown, no elenchi.";

export interface ExplanationInput {
  companyName: string;
  atecoCode: string;
  atecoDescription: string;
  region: string;
  employeeCount: string;
  grantTitle: string;
  issuingBody: string;
  minAmount: number | null;
  maxAmount: number | null;
  deadline: Date | null;
  matchScore: number;
  chips: string[];
}

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export async function generateExplanation(input: ExplanationInput): Promise<string | null> {
  const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
  const model = (process.env.OPENAI_ATECO_MODEL ?? "gpt-4o-mini").trim();
  if (!apiKey) {
    console.warn("[match-explanation] missing OPENAI_API_KEY");
    return null;
  }

  const userPrompt = [
    `Azienda: ${input.companyName}, settore ${input.atecoDescription} (${input.atecoCode}), ${input.region}, dim ${input.employeeCount}`,
    `Bando: ${input.grantTitle}, ${input.issuingBody}, importo ${input.minAmount ?? "?"}-${input.maxAmount ?? "?"} EUR, deadline ${input.deadline ? input.deadline.toISOString().slice(0, 10) : "n/d"}`,
    `Match score: ${input.matchScore}%`,
    `Criteri matchati: ${input.chips.join(", ")}`,
    "",
    "Output: paragrafo 2-3 frasi.",
  ].join("\n");

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    console.warn("[match-explanation] network error", err);
    return null;
  }

  if (!res.ok) {
    console.warn("[match-explanation] HTTP", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as OpenAiResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}
