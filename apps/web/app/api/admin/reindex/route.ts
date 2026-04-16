// apps/web/app/api/admin/reindex/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ingestGrantContent } from "@/lib/services/rag";

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const grants = await prisma.grant.findMany();
  let count = 0;

  for (const grant of grants) {
    const content = `${grant.title}\n\n${grant.description}`;
    await ingestGrantContent(grant.id, content);
    count++;
  }

  return NextResponse.json({ success: true, count });
}
