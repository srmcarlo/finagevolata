import { ChainedCciaaProvider } from "./chain";
import { MockCciaaProvider } from "./mock";
import { OpenApiCciaaProvider } from "./openapi";
import { OpenAiAtecoProvider } from "./openai-ateco";
import type { CciaaProvider } from "./types";
import { ViesCciaaProvider } from "./vies";

export type { CciaaData, CciaaProvider } from "./types";

let cached: CciaaProvider | null = null;

export function getCciaaProvider(): CciaaProvider {
  if (cached) return cached;

  const kind = process.env.CCIAA_PROVIDER ?? "auto";

  switch (kind) {
    case "mock":
      cached = new MockCciaaProvider();
      break;
    case "vies":
      cached = new ViesCciaaProvider();
      break;
    case "openapi":
      cached = new OpenApiCciaaProvider();
      break;
    case "openai":
      cached = new ChainedCciaaProvider([
        new ViesCciaaProvider(),
        new OpenAiAtecoProvider(),
      ]);
      break;
    case "auto":
    default: {
      const providers: CciaaProvider[] = [];
      if (process.env.OPENAPI_IT_TOKEN) {
        providers.push(new OpenApiCciaaProvider());
      }
      providers.push(new ViesCciaaProvider());
      if (process.env.OPENAI_API_KEY) {
        providers.push(new OpenAiAtecoProvider());
      }
      if (process.env.NODE_ENV !== "production") {
        providers.push(new MockCciaaProvider());
      }
      cached = new ChainedCciaaProvider(providers);
    }
  }

  return cached;
}

export function resetCciaaProvider() {
  cached = null;
}
