import { z } from "zod";

export const companyOnboardingSchema = z.object({
  vatNumber: z.string().regex(/^\d{11}$/, "Partita IVA deve essere di 11 cifre"),
  companyName: z.string().min(2, "Ragione sociale richiesta"),
  legalForm: z.string().min(2, "Forma giuridica richiesta"),
  atecoCode: z.string().min(2, "Codice ATECO richiesto"),
  atecoDescription: z.string().min(2, "Descrizione ATECO richiesta"),
  province: z.string().min(2, "Provincia richiesta"),
  region: z.string().min(2, "Regione richiesta"),
  employeeCount: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]),
  annualRevenue: z.number().positive().optional(),
  foundedAt: z.string().datetime().optional(),
});

export const companyInviteSchema = z.object({
  companyEmail: z.string().email("Email non valida"),
});

export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;
export type CompanyInviteInput = z.infer<typeof companyInviteSchema>;
