import type { CciaaData, CciaaProvider } from "./types";
import { PROVINCE_TO_REGION } from "./regions";

const PROD_BASE = "https://company.openapi.com";
const TEST_BASE = "https://test.company.openapi.com";

function pick(obj: any, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const parts = key.split(".");
    let cur: any = obj;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in cur) cur = cur[p];
      else { cur = undefined; break; }
    }
    if (typeof cur === "string" && cur.trim()) return cur.trim();
  }
  return undefined;
}

export class OpenApiCciaaProvider implements CciaaProvider {
  private base: string;
  private token: string;
  private tier: string;

  constructor(opts?: { token?: string; sandbox?: boolean; tier?: string }) {
    this.token = opts?.token ?? process.env.OPENAPI_IT_TOKEN ?? "";
    this.base = opts?.sandbox || process.env.OPENAPI_IT_SANDBOX === "true"
      ? TEST_BASE
      : PROD_BASE;
    this.tier = opts?.tier ?? process.env.OPENAPI_IT_TIER ?? "IT-start";
  }

  async lookup(vatNumber: string): Promise<CciaaData | null> {
    if (!this.token) {
      console.warn("[OpenAPI.it] missing OPENAPI_IT_TOKEN");
      return null;
    }
    if (!/^\d{11}$/.test(vatNumber)) return null;

    const url = `${this.base}/${this.tier}/${vatNumber}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      console.warn("[OpenAPI.it] network error", err);
      return null;
    }

    if (!res.ok) {
      console.warn("[OpenAPI.it] HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }

    const json = await res.json().catch(() => null);
    if (!json) return null;

    const root = json.data?.[0] ?? json.data ?? json;

    const companyName = pick(root, "denominazione", "ragione_sociale", "name", "company_name");
    if (!companyName) {
      console.warn("[OpenAPI.it] no company name in response", JSON.stringify(root).slice(0, 400));
      return null;
    }

    const atecoCode = pick(
      root,
      "ateco",
      "codice_ateco",
      "attivita.codice_ateco",
      "attivita_prevalente.codice",
      "ateco_code",
    ) ?? "";

    const atecoDescription = pick(
      root,
      "descrizione_ateco",
      "attivita.descrizione_ateco",
      "attivita_prevalente.descrizione",
      "ateco_description",
    ) ?? "";

    const legalForm = pick(
      root,
      "forma_giuridica",
      "natura_giuridica",
      "legal_form",
      "tipo_societa",
    ) ?? "";

    const province = (
      pick(root, "provincia", "sede.provincia", "indirizzo.provincia", "province") ?? ""
    ).toUpperCase().slice(0, 2);

    const region =
      pick(root, "regione", "sede.regione", "region") ??
      (province ? PROVINCE_TO_REGION[province] ?? "" : "");

    return {
      companyName,
      legalForm,
      atecoCode,
      atecoDescription,
      province,
      region,
    };
  }
}
