import type { CciaaData, CciaaProvider } from "./types";

const SAMPLES: CciaaData[] = [
  {
    companyName: "Rossi Meccanica Srl",
    legalForm: "SRL",
    atecoCode: "28.99",
    atecoDescription: "Fabbricazione di altre macchine per impieghi speciali",
    province: "MI",
    region: "Lombardia",
  },
  {
    companyName: "Bianchi Consulting SAS",
    legalForm: "SAS",
    atecoCode: "70.22",
    atecoDescription: "Consulenza imprenditoriale e altra consulenza amministrativo-gestionale",
    province: "RM",
    region: "Lazio",
  },
  {
    companyName: "Verdi Agricola SRL",
    legalForm: "SRL",
    atecoCode: "01.11",
    atecoDescription: "Coltivazione di cereali",
    province: "BO",
    region: "Emilia-Romagna",
  },
  {
    companyName: "Neri Tech Srls",
    legalForm: "SRLS",
    atecoCode: "62.01",
    atecoDescription: "Produzione di software non connesso all'edizione",
    province: "TO",
    region: "Piemonte",
  },
];

export class MockCciaaProvider implements CciaaProvider {
  async lookup(vatNumber: string): Promise<CciaaData | null> {
    if (!/^\d{11}$/.test(vatNumber)) return null;
    const lastDigit = Number(vatNumber[vatNumber.length - 1]);
    return SAMPLES[lastDigit % SAMPLES.length];
  }
}
