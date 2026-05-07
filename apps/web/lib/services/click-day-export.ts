const ONE_HOUR_SECONDS = 3600;
const SEVEN_DAYS_SECONDS = 7 * 86400;

export function computeLinkExpirySeconds(
  clickDayDate: Date | null,
  now: Date = new Date(),
): number {
  if (!clickDayDate) return SEVEN_DAYS_SECONDS;
  const targetMs = clickDayDate.getTime() + 86400 * 1000;
  const deltaSeconds = Math.floor((targetMs - now.getTime()) / 1000);
  if (deltaSeconds > SEVEN_DAYS_SECONDS) return SEVEN_DAYS_SECONDS;
  if (deltaSeconds < ONE_HOUR_SECONDS) return ONE_HOUR_SECONDS;
  return deltaSeconds;
}

export interface ClickDayEmailInput {
  grant: {
    title: string;
    issuingBody: string;
    clickDayDate: Date | null;
  };
  company: {
    companyName: string;
    vatNumber: string;
    legalForm: string;
    atecoCode: string;
    atecoDescription: string;
    region: string;
    province: string;
  };
  documents: Array<{ name: string; url: string }>;
  consultant: { name: string; email: string };
  notes: string;
  linkExpiry: Date;
}

export function buildClickDayEmailText(input: ClickDayEmailInput): string {
  const { grant, company, documents, consultant, notes, linkExpiry } = input;
  const clickDayLabel = grant.clickDayDate
    ? grant.clickDayDate.toLocaleString("it-IT")
    : "Da definire";
  const docsBlock = documents
    .map((d, i) => `${i + 1}. ${d.name}: ${d.url}`)
    .join("\n");
  const notesBlock = notes.trim() === "" ? "—" : notes.trim();

  return `Richiesta Click Day da FinAgevolata.

— BANDO —
Titolo: ${grant.title}
Ente: ${grant.issuingBody}
Click Day: ${clickDayLabel}

— AZIENDA —
Ragione sociale: ${company.companyName}
P.IVA: ${company.vatNumber}
Forma giuridica: ${company.legalForm}
ATECO: ${company.atecoCode} — ${company.atecoDescription}
Regione: ${company.region}
Provincia: ${company.province}

— DOCUMENTI (${documents.length} approvati) —
${docsBlock}

— CONSULENTE —
Nome: ${consultant.name}
Email: ${consultant.email}

— NOTE —
${notesBlock}

I link ai documenti scadono il ${linkExpiry.toLocaleString("it-IT")}.

— FinAgevolata
`;
}
