import { z } from "zod";

export const grantTypeEnum = z.enum([
  "FONDO_PERDUTO",
  "FINANZIAMENTO_AGEVOLATO",
  "CREDITO_IMPOSTA",
  "GARANZIA",
]);

export const grantStatusEnum = z.enum(["DRAFT", "PUBLISHED", "CLOSED", "EXPIRED"]);

export const companySizeEnum = z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]);

export const grantDocRequirementInput = z.object({
  documentTypeId: z.string().min(1),
  isRequired: z.boolean().default(true),
  notes: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
});

const grantBase = z.object({
  title: z.string().min(5, "Titolo troppo corto").max(200),
  description: z.string().min(20, "Descrizione troppo corta").max(5000),
  issuingBody: z.string().min(2, "Ente emittente richiesto").max(200),
  grantType: grantTypeEnum,
  minAmount: z.number().nonnegative().nullable().optional(),
  maxAmount: z.number().nonnegative().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  openDate: z.string().datetime().nullable().optional(),
  hasClickDay: z.boolean().default(false),
  clickDayDate: z.string().datetime().nullable().optional(),
  eligibleAtecoCodes: z.array(z.string()).default([]),
  eligibleRegions: z.array(z.string()).default([]),
  eligibleCompanySizes: z.array(companySizeEnum).default([]),
  sourceUrl: z.string().url().nullable().optional().or(z.literal("")),
  documentRequirements: z.array(grantDocRequirementInput).default([]),
});

export const grantCreateSchema = grantBase
  .refine((d) => !d.hasClickDay || !!d.clickDayDate, {
    message: "Click Day abilitato richiede data",
    path: ["clickDayDate"],
  })
  .refine(
    (d) =>
      d.minAmount == null ||
      d.maxAmount == null ||
      d.minAmount <= d.maxAmount,
    {
      message: "Min amount deve essere minore o uguale al max",
      path: ["minAmount"],
    },
  );

export const grantUpdateSchema = grantBase.partial();

export const grantMatchFilters = z.object({
  atecoCode: z.string().optional(),
  region: z.string().optional(),
  companySize: companySizeEnum.optional(),
});

export type GrantCreateInput = z.infer<typeof grantCreateSchema>;
export type GrantUpdateInput = z.infer<typeof grantUpdateSchema>;
export type GrantDocRequirementInput = z.infer<typeof grantDocRequirementInput>;
export type GrantMatchFilters = z.infer<typeof grantMatchFilters>;
