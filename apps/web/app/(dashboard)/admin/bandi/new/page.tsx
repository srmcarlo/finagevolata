import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { createGrant } from "@/lib/actions/grants";

export default async function NewBandoPage() {
  const documentTypes = await prisma.documentType.findMany({ orderBy: { name: "asc" } });

  async function action(data: Parameters<typeof createGrant>[0]) {
    "use server";
    await createGrant(data);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Nuovo bando</h1>
      <GrantForm mode="admin" documentTypes={documentTypes} onSubmit={action} submitLabel="Crea bando" />
    </div>
  );
}
