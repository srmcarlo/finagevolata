import { prisma } from "@/lib/prisma";
import { GrantForm } from "@/components/bandi/grant-form";
import { createGrant } from "@/lib/actions/grants";

export default async function ConsulenteProponiBandoPage() {
  const documentTypes = await prisma.documentType.findMany({ orderBy: { name: "asc" } });

  async function action(data: Parameters<typeof createGrant>[0]) {
    "use server";
    await createGrant(data);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Proponi un bando</h1>
      <GrantForm
        mode="consultant-submit"
        documentTypes={documentTypes}
        onSubmit={action}
        submitLabel="Invia per approvazione"
      />
    </div>
  );
}
