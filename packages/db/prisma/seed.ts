import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DOCUMENT_TYPES = [
  { slug: "visura-camerale", name: "Visura Camerale", description: "Certificato CCIAA con dati legali dell'impresa", validityDays: 180, acceptedFormats: ["pdf"], maxSizeMb: 10, category: "LEGAL" as const },
  { slug: "durc", name: "DURC", description: "Documento Unico Regolarità Contributiva (INPS/INAIL)", validityDays: 120, acceptedFormats: ["pdf"], maxSizeMb: 10, category: "LEGAL" as const },
  { slug: "dsan", name: "Dichiarazione Sostitutiva Atto Notorio", description: "Autocertificazione stati e fatti", validityDays: null, acceptedFormats: ["pdf", "p7m"], maxSizeMb: 10, category: "LEGAL" as const },
  { slug: "bilanci", name: "Bilanci Depositati", description: "Ultimi 2-3 esercizi depositati in CCIAA", validityDays: null, acceptedFormats: ["pdf"], maxSizeMb: 20, category: "FINANCIAL" as const },
  { slug: "business-plan", name: "Business Plan", description: "Piano d'impresa con proiezioni finanziarie", validityDays: null, acceptedFormats: ["pdf", "docx"], maxSizeMb: 20, category: "PROJECT" as const },
  { slug: "de-minimis", name: "Dichiarazione de minimis", description: "Attesta aiuti di stato ricevuti negli ultimi 3 anni (Reg. UE 2023/2831)", validityDays: null, acceptedFormats: ["pdf", "p7m"], maxSizeMb: 10, category: "FISCAL" as const },
  { slug: "preventivi", name: "Preventivi Fornitori", description: "Almeno 2-3 preventivi comparativi per ogni voce di spesa", validityDays: null, acceptedFormats: ["pdf"], maxSizeMb: 20, category: "PROJECT" as const },
  { slug: "antimafia", name: "Dichiarazione Antimafia", description: "Certificato Prefettura per contributi > 150.000 EUR", validityDays: null, acceptedFormats: ["pdf"], maxSizeMb: 10, category: "LEGAL" as const },
  { slug: "antiriciclaggio", name: "Dichiarazione Antiriciclaggio", description: "Identifica titolari effettivi (>25% capitale)", validityDays: null, acceptedFormats: ["pdf"], maxSizeMb: 10, category: "LEGAL" as const },
  { slug: "contabilita-separata", name: "Impegno Contabilità Separata", description: "Impegno a codifica separata spese progetto", validityDays: null, acceptedFormats: ["pdf", "p7m"], maxSizeMb: 10, category: "FINANCIAL" as const },
  { slug: "documento-identita", name: "Documento Identità Legale Rappresentante", description: "Documento di identità in corso di validità", validityDays: null, acceptedFormats: ["pdf", "jpg", "png"], maxSizeMb: 10, category: "LEGAL" as const },
  { slug: "firma-digitale", name: "Certificato Firma Digitale", description: "Firma digitale del legale rappresentante", validityDays: null, acceptedFormats: ["p7m", "cer"], maxSizeMb: 5, category: "LEGAL" as const },
  { slug: "ateco", name: "Certificato Codice ATECO", description: "Classificazione attività economica", validityDays: null, acceptedFormats: ["pdf"], maxSizeMb: 10, category: "LEGAL" as const },
  { slug: "dichiarazioni-fiscali", name: "Dichiarazioni Fiscali", description: "Ultime dichiarazioni dei redditi", validityDays: null, acceptedFormats: ["pdf"], maxSizeMb: 20, category: "FISCAL" as const },
  { slug: "certificazioni", name: "Certificazioni Specifiche", description: "ISO, SOA, ambientali, ecc.", validityDays: null, acceptedFormats: ["pdf"], maxSizeMb: 20, category: "CERTIFICATION" as const },
];

async function main() {
  console.log("Seeding document types...");
  for (const dt of DOCUMENT_TYPES) {
    await prisma.documentType.upsert({
      where: { slug: dt.slug },
      update: dt,
      create: { ...dt, isStandard: true },
    });
  }
  console.log(`Seeded ${DOCUMENT_TYPES.length} document types.`);

  console.log("Seeding admin user...");
  const adminPassword = await hash("admin123456", 12);
  await prisma.user.upsert({
    where: { email: "admin@finagevolata.it" },
    update: {},
    create: {
      email: "admin@finagevolata.it",
      name: "Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Seeded admin user (admin@finagevolata.it / admin123456).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
