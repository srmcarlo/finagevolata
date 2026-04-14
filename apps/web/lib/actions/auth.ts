"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@finagevolata/shared";

export async function registerUser(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
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

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashedPassword,
      role: parsed.data.role,
    },
  });

  return { success: true };
}
