import { z } from "zod";

export const PLAN_SLUGS = ["free", "pro-azienda", "consulente", "studio"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  name: z.string().min(2, "Nome troppo corto"),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  role: z.enum(["CONSULTANT", "COMPANY"], {
    errorMap: () => ({ message: "Ruolo non valido" }),
  }),
  plan: z.enum(PLAN_SLUGS).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
