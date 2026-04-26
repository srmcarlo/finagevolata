import type { CciaaData, CciaaProvider } from "./types";

export class ChainedCciaaProvider implements CciaaProvider {
  constructor(private providers: CciaaProvider[]) {}

  async lookup(vatNumber: string, hint?: Partial<CciaaData>): Promise<CciaaData | null> {
    let merged: CciaaData | null = hint
      ? {
          companyName: hint.companyName ?? "",
          legalForm: hint.legalForm ?? "",
          atecoCode: hint.atecoCode ?? "",
          atecoDescription: hint.atecoDescription ?? "",
          province: hint.province ?? "",
          region: hint.region ?? "",
        }
      : null;

    for (const provider of this.providers) {
      const data = await provider.lookup(vatNumber, merged ?? undefined).catch((err) => {
        console.warn("[CciaaChain] provider error", err);
        return null;
      });
      if (!data) continue;

      if (!merged) {
        merged = { ...data };
      } else {
        merged = {
          companyName: merged.companyName || data.companyName,
          legalForm: merged.legalForm || data.legalForm,
          atecoCode: merged.atecoCode || data.atecoCode,
          atecoDescription: merged.atecoDescription || data.atecoDescription,
          province: merged.province || data.province,
          region: merged.region || data.region,
        };
      }

      if (
        merged.companyName &&
        merged.atecoCode &&
        merged.legalForm &&
        merged.province &&
        merged.region
      ) {
        return merged;
      }
    }

    return merged;
  }
}
