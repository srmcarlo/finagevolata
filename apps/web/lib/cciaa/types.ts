export interface CciaaData {
  companyName: string;
  legalForm: string;
  atecoCode: string;
  atecoDescription: string;
  province: string;
  region: string;
}

export interface CciaaProvider {
  lookup(vatNumber: string): Promise<CciaaData | null>;
}
