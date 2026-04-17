import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email("Email non valida"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(32),
  name: z.string().min(2, "Nome troppo corto").max(100),
  password: z.string().min(8, "Password troppo corta"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
