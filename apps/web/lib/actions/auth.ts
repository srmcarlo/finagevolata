"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/actions/email-verification";
import { registerSchema, type PlanSlug } from "@finagevolata/shared";

function slugToPlanEnum(slug: PlanSlug): "FREE" | "PRO_AZIENDA" | "CONSULENTE" | "STUDIO" {
  return slug.toUpperCase().replace(/-/g, "_") as "FREE" | "PRO_AZIENDA" | "CONSULENTE" | "STUDIO";
}

export async function registerUser(formData: FormData) {
  try {
    const raw = {
      email: formData.get("email") as string,
      name: formData.get("name") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
      plan: (formData.get("plan") as string | null) || undefined,
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.errors[0].message };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return { error: "Email già registrata" };
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    const created = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        password: hashedPassword,
        role: parsed.data.role,
        plan: parsed.data.plan ? slugToPlanEnum(parsed.data.plan) : "FREE",
      },
    });

    // Trigger email verification flow: generate code, hash + store, dispatch email.
    // Errors are logged inside issueVerificationCode; signup still succeeds so the
    // user can request a new code from /verify-email.
    await issueVerificationCode(created.id);

    return { success: true, requiresVerification: true, email: created.email };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[registerUser] fatal:", msg, err);
    return { error: `Errore server: ${msg}` };
  }
}
