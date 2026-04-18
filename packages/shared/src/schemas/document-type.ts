// packages/shared/src/schemas/document-type.ts
import { z } from "zod";

export const documentCategoryEnum = z.enum([
  "LEGAL",
  "FINANCIAL",
  "FISCAL",
  "PROJECT",
  "CERTIFICATION",
]);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const documentTypeBase = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(slugRegex, "Slug invalido (lowercase, trattini)"),
  name: z.string().min(2).max(120),
  description: z.string().min(5).max(1000),
  category: documentCategoryEnum,
  validityDays: z.number().int().positive().nullable().optional(),
  acceptedFormats: z.array(z.string()).default(["pdf"]),
  maxSizeMb: z.number().int().positive().max(100).default(10),
});

export const documentTypeCreateSchema = documentTypeBase;
export const documentTypeUpdateSchema = documentTypeBase.partial();

export type DocumentTypeCreateInput = z.infer<typeof documentTypeCreateSchema>;
export type DocumentTypeUpdateInput = z.infer<typeof documentTypeUpdateSchema>;
