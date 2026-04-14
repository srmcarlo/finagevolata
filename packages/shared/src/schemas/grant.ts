import { z } from "zod";

export const grantCreateSchema = z.object({
  title: z.string().min(3, "Titolo troppo corto"),
  description: z.string().min(10, "Descrizione troppo corta"),
  issuingBody: z.string().min(2, "Ente emittente richiesto"),
  grantType: z.enum(["FONDO_PERDUTO", "FINANZIAMENTO_AGEVOLATO", "CREDITO_IMPOSTA", "GARANZIA"]),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  deadline: z.string().datetime().optional(),
  openDate: z.string().datetime().optional(),
  hasClickDay: z.boolean().default(false),
  clickDayDate: z.string().datetime().optional(),
  eligibleAtecoCodes: z.array(z.string()).default([]),
  eligibleRegions: z.array(z.string()).default([]),
  eligibleCompanySizes: z.array(z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"])).default([]),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  documentRequirements: z.array(z.object({
    documentTypeId: z.string(),
    isRequired: z.boolean().default(true),
    notes: z.string().optional(),
    order: z.number().default(0),
  })).default([]),
});

export const grantMatchFilters = z.object({
  atecoCode: z.string().optional(),
  region: z.string().optional(),
  companySize: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]).optional(),
});

export type GrantCreateInput = z.infer<typeof grantCreateSchema>;
export type GrantMatchFilters = z.infer<typeof grantMatchFilters>;
