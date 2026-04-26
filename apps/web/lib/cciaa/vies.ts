import type { CciaaData, CciaaProvider } from "./types";
import { PROVINCE_TO_REGION } from "./regions";

const VIES_URL =
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

const LEGAL_FORM_HINTS: Array<{ pattern: RegExp; form: string }> = [
  { pattern: /\bS\.?R\.?L\.?S\.?\b/i, form: "SRLS" },
  { pattern: /\bS\.?R\.?L\.?\b/i, form: "SRL" },
  { pattern: /\bS\.?P\.?A\.?\b/i, form: "SPA" },
  { pattern: /\bS\.?A\.?S\.?\b/i, form: "SAS" },
  { pattern: /\bS\.?N\.?C\.?\b/i, form: "SNC" },
  { pattern: /\bS\.?S\.?\b/i, form: "SS" },
  { pattern: /\bSOC\.?\s+COOP/i, form: "COOP" },
];

function parseAddress(address: string): { province?: string; region?: string } {
  const lines = address.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^\d{5}\s+.+\s+([A-Z]{2})$/);
    if (match) {
      const province = match[1];
      return { province, region: PROVINCE_TO_REGION[province] };
    }
  }
  return {};
}

function inferLegalForm(name: string): string {
  for (const { pattern, form } of LEGAL_FORM_HINTS) {
    if (pattern.test(name)) return form;
  }
  return "";
}

interface ViesResponse {
  valid: boolean;
  name?: string;
  address?: string;
}

export class ViesCciaaProvider implements CciaaProvider {
  async lookup(vatNumber: string): Promise<CciaaData | null> {
    if (!/^\d{11}$/.test(vatNumber)) return null;

    let res: Response;
    try {
      res = await fetch(VIES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: "IT", vatNumber }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.warn("[VIES] network error", err);
      return null;
    }

    if (!res.ok) {
      console.warn("[VIES] HTTP", res.status);
      return null;
    }

    const data = (await res.json()) as ViesResponse;
    if (!data.valid || !data.name) return null;

    const { province, region } = data.address ? parseAddress(data.address) : {};

    return {
      companyName: data.name.trim(),
      legalForm: inferLegalForm(data.name),
      atecoCode: "",
      atecoDescription: "",
      province: province ?? "",
      region: region ?? "",
    };
  }
}
