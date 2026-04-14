import { z } from "zod";

export const practiceCreateSchema = z.object({
  grantId: z.string().min(1),
  companyId: z.string().min(1),
});

export const documentReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
}).refine(
  (data) => data.status !== "REJECTED" || (data.rejectionReason && data.rejectionReason.length > 0),
  { message: "Motivo del rifiuto richiesto", path: ["rejectionReason"] }
);

export type PracticeCreateInput = z.infer<typeof practiceCreateSchema>;
export type DocumentReviewInput = z.infer<typeof documentReviewSchema>;
