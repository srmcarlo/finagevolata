// apps/web/lib/actions/document-types.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  documentTypeCreateSchema,
  documentTypeUpdateSchema,
  type DocumentTypeCreateInput,
  type DocumentTypeUpdateInput,
} from "@finagevolata/shared";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) throw new Error("Non autorizzato");
  if (user.role !== "ADMIN") throw new Error("Accesso negato");
  return { userId: user.id };
}

export async function createDocumentType(input: DocumentTypeCreateInput) {
  await requireAdmin();
  const data = documentTypeCreateSchema.parse(input);
  const created = await prisma.documentType.create({
    data: { ...data, isStandard: false },
  });
  revalidatePath("/admin/documenti");
  return created;
}

export async function updateDocumentType(id: string, input: DocumentTypeUpdateInput) {
  await requireAdmin();
  const data = documentTypeUpdateSchema.parse(input);
  const updated = await prisma.documentType.update({ where: { id }, data });
  revalidatePath("/admin/documenti");
  revalidatePath(`/admin/documenti/${id}`);
  return updated;
}

export async function deleteDocumentType(id: string) {
  await requireAdmin();
  const existing = await prisma.documentType.findUnique({ where: { id } });
  if (!existing) throw new Error("DocumentType non trovato");
  if (existing.isStandard) throw new Error("Impossibile eliminare un DocumentType standard");
  await prisma.documentType.delete({ where: { id } });
  revalidatePath("/admin/documenti");
}
