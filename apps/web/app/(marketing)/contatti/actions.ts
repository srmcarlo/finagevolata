"use server";

import { z } from "zod";
import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const ContactSchema = z.object({
  name: z.string().min(2, "Nome troppo corto").max(100),
  email: z.string().email("Email non valida"),
  role: z.enum(["consulente", "azienda", "altro"], {
    errorMap: () => ({ message: "Ruolo non valido" }),
  }),
  message: z.string().min(10, "Messaggio troppo corto").max(2000),
  plan: z.string().optional(),
});

export type ContactInput = z.infer<typeof ContactSchema>;

export async function submitContact(input: unknown): Promise<{ ok: true }> {
  const parsed = ContactSchema.parse(input);

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

  const recent = await prisma.contactLead.findFirst({
    where: {
      ipHash,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recent) {
    throw new Error("Troppi tentativi. Riprova tra un minuto.");
  }

  await prisma.contactLead.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      message: parsed.message,
      plan: parsed.plan ?? null,
      ipHash,
    },
  });

  await sendEmail({
    to: process.env.CONTACT_EMAIL_TO ?? "axentra.italia@gmail.com",
    subject: `[Contact] ${parsed.name} (${parsed.role})`,
    text: `Nuovo contatto dal sito FinAgevolata.

Nome: ${parsed.name}
Email: ${parsed.email}
Ruolo: ${parsed.role}
Piano di interesse: ${parsed.plan ?? "-"}

Messaggio:
${parsed.message}
`,
  });

  return { ok: true };
}
