// packages/db/prisma/seed.ts
import { PrismaClient, DocumentCategory } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedDoc {
  slug: string;
  name: string;
  description: string;
  category: DocumentCategory;
  validityDays: number | null;
}

const STANDARD_DOCS: SeedDoc[] = [
  { slug: "visura-camerale", name: "Visura Camerale", description: "Certificato CCIAA con dati legali dell'impresa", category: "LEGAL", validityDays: 180 },
  { slug: "durc", name: "DURC", description: "Documento Unico Regolarità Contributiva (INPS/INAIL)", category: "LEGAL", validityDays: 120 },
  { slug: "dsan", name: "DSAN", description: "Dichiarazione Sostitutiva di Atto Notorio", category: "LEGAL", validityDays: null },
  { slug: "bilanci", name: "Bilanci", description: "Ultimi 2-3 esercizi depositati in CCIAA", category: "FINANCIAL", validityDays: null },
  { slug: "business-plan", name: "Business Plan", description: "Piano d'impresa con proiezioni finanziarie", category: "PROJECT", validityDays: null },
  { slug: "de-minimis", name: "Dichiarazione de minimis", description: "Attesta aiuti di stato ricevuti negli ultimi 3 anni (Reg. UE 2023/2831)", category: "FISCAL", validityDays: null },
  { slug: "preventivi", name: "Preventivi fornitori", description: "Almeno 2-3 preventivi comparativi per voce di spesa, firmati", category: "PROJECT", validityDays: null },
  { slug: "antimafia", name: "Dichiarazione Antimafia", description: "Certificato Prefettura per contributi > 150.000 EUR", category: "LEGAL", validityDays: null },
  { slug: "antiriciclaggio", name: "Dichiarazione Antiriciclaggio", description: "Identifica titolari effettivi (>25% capitale)", category: "LEGAL", validityDays: null },
  { slug: "contabilita-separata", name: "Contabilità Separata", description: "Impegno a codifica separata spese progetto", category: "FINANCIAL", validityDays: null },
  { slug: "doc-identita", name: "Documento d'identità", description: "Legale rappresentante, in corso di validità", category: "LEGAL", validityDays: null },
  { slug: "firma-digitale", name: "Firma digitale", description: "Del legale rappresentante, necessaria per invio telematico", category: "CERTIFICATION", validityDays: null },
  { slug: "codice-ateco", name: "Codice ATECO", description: "Classificazione attività economica nel settore ammesso", category: "LEGAL", validityDays: null },
  { slug: "dichiarazioni-fiscali", name: "Dichiarazioni fiscali", description: "Ultime dichiarazioni dei redditi (regolarità fiscale)", category: "FISCAL", validityDays: null },
  { slug: "certificazioni", name: "Certificazioni specifiche", description: "ISO, SOA, ambientali (dipendono dal bando)", category: "CERTIFICATION", validityDays: null },
];

async function main() {
  console.log(`Seeding ${STANDARD_DOCS.length} standard DocumentType entries...`);
  for (const doc of STANDARD_DOCS) {
    await prisma.documentType.upsert({
      where: { slug: doc.slug },
      update: {},
      create: {
        slug: doc.slug,
        name: doc.name,
        description: doc.description,
        category: doc.category,
        validityDays: doc.validityDays,
        acceptedFormats: ["pdf"],
        maxSizeMb: 10,
        isStandard: true,
      },
    });
    console.log(`  ✓ ${doc.slug}`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
