import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ============================================================
  // 1. CONSULENTE DEMO
  // ============================================================
  console.log("Creando consulente demo...");
  const consultantPassword = await hash("consulente123", 12);
  const consultant = await prisma.user.upsert({
    where: { email: "marco.bianchi@studio-bianchi.it" },
    update: {},
    create: {
      email: "marco.bianchi@studio-bianchi.it",
      name: "Marco Bianchi",
      password: consultantPassword,
      role: "CONSULTANT",
      consultantProfile: {
        create: {
          firmName: "Studio Bianchi & Associati",
          specializations: ["PNRR", "Industria 4.0", "Credito d'imposta"],
          maxClients: 30,
        },
      },
    },
  });
  console.log(`  ✓ Consulente: marco.bianchi@studio-bianchi.it / consulente123`);

  // ============================================================
  // 2. AZIENDE DEMO
  // ============================================================
  console.log("Creando aziende demo...");
  const companyPassword = await hash("azienda123", 12);

  // Azienda 1 - Costruzioni (Lombardia)
  const company1 = await prisma.user.upsert({
    where: { email: "info@rossi-costruzioni.it" },
    update: {},
    create: {
      email: "info@rossi-costruzioni.it",
      name: "Luigi Rossi",
      password: companyPassword,
      role: "COMPANY",
      companyProfile: {
        create: {
          vatNumber: "01234567890",
          companyName: "Rossi Costruzioni SRL",
          legalForm: "SRL",
          atecoCode: "41.20",
          atecoDescription: "Costruzione di edifici residenziali e non residenziali",
          province: "MI",
          region: "Lombardia",
          employeeCount: "SMALL",
        },
      },
    },
  });
  console.log(`  ✓ Azienda: info@rossi-costruzioni.it / azienda123 (Costruzioni, Lombardia)`);

  // Azienda 2 - Software (Lazio)
  const company2 = await prisma.user.upsert({
    where: { email: "admin@techsolutions.it" },
    update: {},
    create: {
      email: "admin@techsolutions.it",
      name: "Anna Verdi",
      password: companyPassword,
      role: "COMPANY",
      companyProfile: {
        create: {
          vatNumber: "09876543210",
          companyName: "TechSolutions SRL",
          legalForm: "SRL",
          atecoCode: "62.01",
          atecoDescription: "Produzione di software non connesso all'edizione",
          province: "RM",
          region: "Lazio",
          employeeCount: "MICRO",
        },
      },
    },
  });
  console.log(`  ✓ Azienda: admin@techsolutions.it / azienda123 (Software, Lazio)`);

  // Azienda 3 - Manifattura (Veneto)
  const company3 = await prisma.user.upsert({
    where: { email: "info@meccanica-ferrari.it" },
    update: {},
    create: {
      email: "info@meccanica-ferrari.it",
      name: "Giuseppe Ferrari",
      password: companyPassword,
      role: "COMPANY",
      companyProfile: {
        create: {
          vatNumber: "05678901234",
          companyName: "Meccanica Ferrari SPA",
          legalForm: "SPA",
          atecoCode: "25.62",
          atecoDescription: "Lavori di meccanica generale",
          province: "VR",
          region: "Veneto",
          employeeCount: "MEDIUM",
        },
      },
    },
  });
  console.log(`  ✓ Azienda: info@meccanica-ferrari.it / azienda123 (Meccanica, Veneto)`);

  // ============================================================
  // 3. RELAZIONI CONSULENTE-AZIENDA
  // ============================================================
  console.log("Creando relazioni consulente-azienda...");

  for (const company of [company1, company2, company3]) {
    await prisma.consultantCompany.upsert({
      where: {
        consultantId_companyId: {
          consultantId: consultant.id,
          companyId: company.id,
        },
      },
      update: {},
      create: {
        consultantId: consultant.id,
        companyId: company.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ 3 aziende collegate al consulente Marco Bianchi`);

  // ============================================================
  // 4. BANDI DEMO
  // ============================================================
  console.log("Creando bandi demo...");

  // Recupera admin per createdById
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@finagevolata.it" },
  });

  // Recupera document types
  const docTypes = await prisma.documentType.findMany();
  const docTypeBySlug = (slug: string) => docTypes.find((d) => d.slug === slug)!;

  // Bando 1 - Macchinari Innovativi (Click Day)
  const grant1 = await prisma.grant.upsert({
    where: { id: "demo-grant-macchinari" },
    update: {},
    create: {
      id: "demo-grant-macchinari",
      title: "Bando Macchinari Innovativi 2025",
      description:
        "Contributo a fondo perduto fino al 50% per l'acquisto di macchinari innovativi, tecnologie digitali e impianti di produzione a basso impatto ambientale. Destinato a PMI del settore manifatturiero e costruzioni.",
      issuingBody: "MISE - Ministero delle Imprese e del Made in Italy",
      grantType: "FONDO_PERDUTO",
      maxAmount: 250000,
      minAmount: 20000,
      deadline: new Date("2025-09-30"),
      openDate: new Date("2025-06-01"),
      hasClickDay: true,
      clickDayDate: new Date("2025-06-15T09:00:00"),
      status: "PUBLISHED",
      eligibleAtecoCodes: ["25", "28", "29", "41", "42", "43"],
      eligibleRegions: [],
      eligibleCompanySizes: ["MICRO", "SMALL", "MEDIUM"],
      sourceUrl: "https://www.mise.gov.it/bandi/macchinari-innovativi-2025",
      approvedByAdmin: true,
      createdById: admin.id,
    },
  });

  // Documenti richiesti dal bando macchinari
  const macchinariDocs = [
    "visura-camerale",
    "durc",
    "bilanci",
    "business-plan",
    "de-minimis",
    "preventivi",
    "documento-identita",
    "dichiarazioni-fiscali",
    "ateco",
  ];
  for (let i = 0; i < macchinariDocs.length; i++) {
    const dt = docTypeBySlug(macchinariDocs[i]);
    await prisma.grantDocumentRequirement.upsert({
      where: { grantId_documentTypeId: { grantId: grant1.id, documentTypeId: dt.id } },
      update: {},
      create: {
        grantId: grant1.id,
        documentTypeId: dt.id,
        isRequired: true,
        order: i + 1,
      },
    });
  }
  console.log(`  ✓ Bando: Macchinari Innovativi 2025 (Click Day, 9 documenti richiesti)`);

  // Bando 2 - Digitalizzazione PMI
  const grant2 = await prisma.grant.upsert({
    where: { id: "demo-grant-digital" },
    update: {},
    create: {
      id: "demo-grant-digital",
      title: "Voucher Digitalizzazione PMI 2025",
      description:
        "Voucher fino a 40.000€ per progetti di trasformazione digitale: e-commerce, cybersecurity, cloud computing, ERP, CRM. Aperto a tutte le PMI italiane.",
      issuingBody: "Unioncamere - Camere di Commercio",
      grantType: "FONDO_PERDUTO",
      maxAmount: 40000,
      minAmount: 5000,
      deadline: new Date("2025-12-15"),
      openDate: new Date("2025-03-01"),
      hasClickDay: false,
      status: "PUBLISHED",
      eligibleAtecoCodes: ["62", "63", "58", "47", "46", "25", "28", "41"],
      eligibleRegions: [],
      eligibleCompanySizes: ["MICRO", "SMALL", "MEDIUM"],
      sourceUrl: "https://www.unioncamere.gov.it/voucher-digital-2025",
      approvedByAdmin: true,
      createdById: admin.id,
    },
  });

  const digitalDocs = [
    "visura-camerale",
    "durc",
    "de-minimis",
    "preventivi",
    "business-plan",
    "documento-identita",
  ];
  for (let i = 0; i < digitalDocs.length; i++) {
    const dt = docTypeBySlug(digitalDocs[i]);
    await prisma.grantDocumentRequirement.upsert({
      where: { grantId_documentTypeId: { grantId: grant2.id, documentTypeId: dt.id } },
      update: {},
      create: {
        grantId: grant2.id,
        documentTypeId: dt.id,
        isRequired: true,
        order: i + 1,
      },
    });
  }
  console.log(`  ✓ Bando: Voucher Digitalizzazione PMI 2025 (6 documenti richiesti)`);

  // Bando 3 - INAIL Sicurezza
  const grant3 = await prisma.grant.upsert({
    where: { id: "demo-grant-inail" },
    update: {},
    create: {
      id: "demo-grant-inail",
      title: "Bando ISI INAIL 2025 - Sicurezza sul lavoro",
      description:
        "Contributo a fondo perduto fino al 65% per interventi di miglioramento delle condizioni di salute e sicurezza nei luoghi di lavoro. Importo massimo 130.000€.",
      issuingBody: "INAIL",
      grantType: "FONDO_PERDUTO",
      maxAmount: 130000,
      minAmount: 5000,
      deadline: new Date("2025-07-20"),
      openDate: new Date("2025-04-01"),
      hasClickDay: true,
      clickDayDate: new Date("2025-06-25T11:00:00"),
      status: "PUBLISHED",
      eligibleAtecoCodes: ["25", "28", "41", "42", "43", "10", "14", "15"],
      eligibleRegions: [],
      eligibleCompanySizes: ["MICRO", "SMALL", "MEDIUM", "LARGE"],
      sourceUrl: "https://www.inail.it/bandi-isi-2025",
      approvedByAdmin: true,
      createdById: admin.id,
    },
  });

  const inailDocs = [
    "visura-camerale",
    "durc",
    "dsan",
    "bilanci",
    "preventivi",
    "antimafia",
    "documento-identita",
    "contabilita-separata",
  ];
  for (let i = 0; i < inailDocs.length; i++) {
    const dt = docTypeBySlug(inailDocs[i]);
    await prisma.grantDocumentRequirement.upsert({
      where: { grantId_documentTypeId: { grantId: grant3.id, documentTypeId: dt.id } },
      update: {},
      create: {
        grantId: grant3.id,
        documentTypeId: dt.id,
        isRequired: true,
        order: i + 1,
      },
    });
  }
  console.log(`  ✓ Bando: ISI INAIL 2025 (Click Day, 8 documenti richiesti)`);

  // Bando 4 - Credito d'imposta R&D (solo Lazio)
  const grant4 = await prisma.grant.upsert({
    where: { id: "demo-grant-rnd" },
    update: {},
    create: {
      id: "demo-grant-rnd",
      title: "Credito d'Imposta Ricerca & Sviluppo Lazio",
      description:
        "Credito d'imposta fino al 45% per attività di ricerca e sviluppo, innovazione tecnologica e design. Riservato alle imprese con sede nel Lazio.",
      issuingBody: "Regione Lazio",
      grantType: "CREDITO_IMPOSTA",
      maxAmount: 100000,
      minAmount: 10000,
      deadline: new Date("2025-11-30"),
      openDate: new Date("2025-05-01"),
      hasClickDay: false,
      status: "PUBLISHED",
      eligibleAtecoCodes: ["62", "63", "72", "71"],
      eligibleRegions: ["Lazio"],
      eligibleCompanySizes: ["MICRO", "SMALL", "MEDIUM"],
      sourceUrl: "https://www.regione.lazio.it/credito-imposta-rd",
      approvedByAdmin: true,
      createdById: admin.id,
    },
  });

  const rndDocs = [
    "visura-camerale",
    "durc",
    "bilanci",
    "business-plan",
    "de-minimis",
    "dichiarazioni-fiscali",
    "certificazioni",
  ];
  for (let i = 0; i < rndDocs.length; i++) {
    const dt = docTypeBySlug(rndDocs[i]);
    await prisma.grantDocumentRequirement.upsert({
      where: { grantId_documentTypeId: { grantId: grant4.id, documentTypeId: dt.id } },
      update: {},
      create: {
        grantId: grant4.id,
        documentTypeId: dt.id,
        isRequired: true,
        order: i + 1,
      },
    });
  }
  console.log(`  ✓ Bando: Credito d'Imposta R&D Lazio (7 documenti, solo Lazio)`);

  // Bando 5 - Bozza da approvare (proposta consulente)
  await prisma.grant.upsert({
    where: { id: "demo-grant-draft" },
    update: {},
    create: {
      id: "demo-grant-draft",
      title: "Bando Transizione Ecologica PMI 2025",
      description:
        "Finanziamento agevolato per investimenti in economia circolare, efficienza energetica e riduzione delle emissioni. Proposta in attesa di approvazione admin.",
      issuingBody: "MASE - Ministero dell'Ambiente",
      grantType: "FINANZIAMENTO_AGEVOLATO",
      maxAmount: 500000,
      minAmount: 50000,
      deadline: new Date("2025-10-31"),
      hasClickDay: false,
      status: "DRAFT",
      eligibleAtecoCodes: ["25", "28", "38", "41"],
      eligibleRegions: [],
      eligibleCompanySizes: ["SMALL", "MEDIUM", "LARGE"],
      approvedByAdmin: false,
      createdById: consultant.id,
    },
  });
  console.log(`  ✓ Bando bozza: Transizione Ecologica PMI 2025 (da approvare)`);

  // ============================================================
  // 5. PRATICHE DEMO
  // ============================================================
  console.log("Creando pratiche demo...");

  // Pratica 1: Rossi Costruzioni + Macchinari (in corso, alcuni documenti caricati)
  const practice1 = await prisma.practice.upsert({
    where: { id: "demo-practice-1" },
    update: {},
    create: {
      id: "demo-practice-1",
      grantId: grant1.id,
      companyId: company1.id,
      consultantId: consultant.id,
      status: "DOCUMENTS_REVIEW",
      notes: "Cliente molto collaborativo, documenti arrivano in tempo",
    },
  });

  // Crea documenti per pratica 1
  const practice1Docs = await prisma.grantDocumentRequirement.findMany({
    where: { grantId: grant1.id },
    include: { documentType: true },
    orderBy: { order: "asc" },
  });

  for (const req of practice1Docs) {
    let status: "MISSING" | "UPLOADED" | "APPROVED" | "REJECTED" = "MISSING";
    let rejectionReason: string | null = null;

    // Simula stati diversi per i documenti
    if (["visura-camerale", "durc", "documento-identita", "ateco"].includes(req.documentType.slug)) {
      status = "APPROVED";
    } else if (["bilanci", "de-minimis"].includes(req.documentType.slug)) {
      status = "UPLOADED";
    } else if (req.documentType.slug === "business-plan") {
      status = "REJECTED";
      rejectionReason = "Il business plan non include le proiezioni finanziarie a 3 anni come richiesto dal bando. Si prega di integrare con analisi costi-benefici dettagliata.";
    }

    await prisma.practiceDocument.upsert({
      where: {
        practiceId_documentTypeId: {
          practiceId: practice1.id,
          documentTypeId: req.documentTypeId,
        },
      },
      update: {},
      create: {
        practiceId: practice1.id,
        documentTypeId: req.documentTypeId,
        status,
        rejectionReason,
        uploadedAt: status !== "MISSING" ? new Date() : null,
        reviewedAt: status === "APPROVED" || status === "REJECTED" ? new Date() : null,
        reviewedById: status === "APPROVED" || status === "REJECTED" ? consultant.id : null,
      },
    });
  }
  console.log(`  ✓ Pratica: Rossi Costruzioni + Macchinari Innovativi (4 approvati, 2 caricati, 1 rifiutato, 2 mancanti)`);

  // Pratica 2: TechSolutions + Voucher Digitalizzazione (appena aperta)
  const practice2 = await prisma.practice.upsert({
    where: { id: "demo-practice-2" },
    update: {},
    create: {
      id: "demo-practice-2",
      grantId: grant2.id,
      companyId: company2.id,
      consultantId: consultant.id,
      status: "DOCUMENTS_PENDING",
    },
  });

  const practice2Docs = await prisma.grantDocumentRequirement.findMany({
    where: { grantId: grant2.id },
    include: { documentType: true },
  });

  for (const req of practice2Docs) {
    await prisma.practiceDocument.upsert({
      where: {
        practiceId_documentTypeId: {
          practiceId: practice2.id,
          documentTypeId: req.documentTypeId,
        },
      },
      update: {},
      create: {
        practiceId: practice2.id,
        documentTypeId: req.documentTypeId,
        status: "MISSING",
      },
    });
  }
  console.log(`  ✓ Pratica: TechSolutions + Voucher Digitalizzazione (tutti documenti mancanti)`);

  // Pratica 3: Meccanica Ferrari + INAIL (pronta per invio)
  const practice3 = await prisma.practice.upsert({
    where: { id: "demo-practice-3" },
    update: {},
    create: {
      id: "demo-practice-3",
      grantId: grant3.id,
      companyId: company3.id,
      consultantId: consultant.id,
      status: "READY",
      clickDayStatus: "NONE",
    },
  });

  const practice3Docs = await prisma.grantDocumentRequirement.findMany({
    where: { grantId: grant3.id },
  });

  for (const req of practice3Docs) {
    await prisma.practiceDocument.upsert({
      where: {
        practiceId_documentTypeId: {
          practiceId: practice3.id,
          documentTypeId: req.documentTypeId,
        },
      },
      update: {},
      create: {
        practiceId: practice3.id,
        documentTypeId: req.documentTypeId,
        status: "APPROVED",
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reviewedById: consultant.id,
      },
    });
  }
  console.log(`  ✓ Pratica: Meccanica Ferrari + INAIL (tutti documenti approvati, pronta!)`);

  // ============================================================
  // 6. NOTIFICHE DEMO
  // ============================================================
  console.log("Creando notifiche demo...");

  await prisma.notification.createMany({
    data: [
      {
        userId: consultant.id,
        type: "DOCUMENT_REVIEWED",
        title: "Documento caricato",
        message: "Rossi Costruzioni ha caricato i Bilanci Depositati per il bando Macchinari Innovativi.",
        practiceId: practice1.id,
        isRead: false,
      },
      {
        userId: consultant.id,
        type: "DOCUMENT_REVIEWED",
        title: "Documento caricato",
        message: "Rossi Costruzioni ha caricato la Dichiarazione de minimis per il bando Macchinari Innovativi.",
        practiceId: practice1.id,
        isRead: false,
      },
      {
        userId: consultant.id,
        type: "GRANT_DEADLINE",
        title: "Scadenza bando in avvicinamento",
        message: "Il bando ISI INAIL 2025 scade il 20/07/2025. La pratica Meccanica Ferrari e pronta per l'invio.",
        practiceId: practice3.id,
        isRead: true,
      },
      {
        userId: company1.id,
        type: "DOCUMENT_REVIEWED",
        title: "Documento rifiutato",
        message: "Il tuo Business Plan per il bando Macchinari Innovativi e stato rifiutato. Motivo: mancano le proiezioni finanziarie a 3 anni.",
        practiceId: practice1.id,
        isRead: false,
      },
      {
        userId: company1.id,
        type: "DOCUMENT_REQUESTED",
        title: "Documenti mancanti",
        message: "Sono ancora richiesti: Preventivi Fornitori e Dichiarazioni Fiscali per il bando Macchinari Innovativi.",
        practiceId: practice1.id,
        isRead: false,
      },
      {
        userId: company2.id,
        type: "PRACTICE_UPDATE",
        title: "Nuova pratica aperta",
        message: "Il consulente Marco Bianchi ha aperto una pratica per il Voucher Digitalizzazione PMI 2025. Carica i documenti richiesti.",
        practiceId: practice2.id,
        isRead: false,
      },
      {
        userId: company3.id,
        type: "PRACTICE_UPDATE",
        title: "Pratica pronta per l'invio!",
        message: "Tutti i documenti per il bando ISI INAIL 2025 sono stati approvati. La domanda verra inviata al Click Day del 25/06/2025.",
        practiceId: practice3.id,
        isRead: false,
      },
    ],
  });
  console.log(`  ✓ 7 notifiche create per consulente e aziende`);

  // ============================================================
  // RIEPILOGO
  // ============================================================
  console.log("\n========================================");
  console.log("  DATI DEMO CREATI CON SUCCESSO!");
  console.log("========================================\n");
  console.log("ACCOUNT DEMO:");
  console.log("┌──────────────┬──────────────────────────────────────┬───────────────┐");
  console.log("│ Ruolo        │ Email                                │ Password      │");
  console.log("├──────────────┼──────────────────────────────────────┼───────────────┤");
  console.log("│ Admin        │ admin@finagevolata.it                │ admin123456   │");
  console.log("│ Consulente   │ marco.bianchi@studio-bianchi.it     │ consulente123 │");
  console.log("│ Azienda 1    │ info@rossi-costruzioni.it           │ azienda123    │");
  console.log("│ Azienda 2    │ admin@techsolutions.it              │ azienda123    │");
  console.log("│ Azienda 3    │ info@meccanica-ferrari.it           │ azienda123    │");
  console.log("└──────────────┴──────────────────────────────────────┴───────────────┘\n");
  console.log("BANDI (5):");
  console.log("  1. Macchinari Innovativi 2025 (MISE, Click Day, 9 docs)");
  console.log("  2. Voucher Digitalizzazione PMI 2025 (Unioncamere, 6 docs)");
  console.log("  3. ISI INAIL 2025 - Sicurezza (INAIL, Click Day, 8 docs)");
  console.log("  4. Credito d'Imposta R&D Lazio (Regione Lazio, 7 docs, solo Lazio)");
  console.log("  5. Transizione Ecologica PMI 2025 (BOZZA - da approvare)\n");
  console.log("PRATICHE (3):");
  console.log("  1. Rossi Costruzioni + Macchinari → In revisione (4/9 approvati)");
  console.log("  2. TechSolutions + Digitalizzazione → Documenti in attesa (0/6)");
  console.log("  3. Meccanica Ferrari + INAIL → PRONTA per invio (8/8 approvati)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
