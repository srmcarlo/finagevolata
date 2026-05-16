// apps/web/lib/email.ts
import { Resend } from "resend";
import { getBaseUrl } from "@/lib/base-url";

export async function sendEmail({
  to,
  cc,
  subject,
  text,
}: {
  to: string;
  cc?: string | string[];
  subject: string;
  text: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY non configurata. E-mail non inviata:", subject);
    return { success: false, error: "Missing API Key" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to,
      ...(cc ? { cc } : {}),
      subject,
      text,
    });

    if (error) {
      console.error("Errore invio e-mail Resend:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Errore imprevisto e-mail:", error);
    return { success: false, error };
  }
}

/**
 * Notifica il consulente che un'azienda ha caricato un documento
 */
export async function sendDocumentUploadedEmail(consultantEmail: string, companyName: string, documentName: string) {
    return sendEmail({
        to: consultantEmail,
        subject: `[FinAgevolata] Nuovo documento caricato da ${companyName}`,
        text: `L'azienda ${companyName} ha appena caricato il documento "${documentName}". Accedi al portale per revisionarlo.`
    });
}

/**
 * Notifica l'azienda dell'esito della revisione documento da parte del consulente
 */
export async function sendDocumentReviewedEmail(
  companyEmail: string,
  documentName: string,
  isApproved: boolean,
  rejectionReason?: string
) {
  const subject = isApproved
    ? `[FinAgevolata] Documento approvato: ${documentName}`
    : `[FinAgevolata] Documento rifiutato: ${documentName}`;
  const text = isApproved
    ? `Il documento "${documentName}" è stato approvato dal tuo consulente. Accedi al portale per vedere lo stato della tua pratica.`
    : `Il documento "${documentName}" è stato rifiutato dal tuo consulente.${rejectionReason ? `\n\nMotivo: ${rejectionReason}` : ""}\n\nAccedi al portale per caricare una versione corretta.`;
  return sendEmail({ to: companyEmail, subject, text });
}

/**
 * Reminder progressivo scadenza bando (30 / 15 / 7 / 1 giorno)
 */
export async function sendGrantDeadlineReminder({
  to,
  grantTitle,
  daysLeft,
}: {
  to: string;
  grantTitle: string;
  daysLeft: number;
}) {
  const subject =
    daysLeft <= 1
      ? `[Scadenza imminente] ${grantTitle} scade domani`
      : `[Promemoria] ${grantTitle} scade tra ${daysLeft} giorni`;
  const text = `Il bando "${grantTitle}" scade tra ${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"}.\n\nAccedi al portale per completare il caricamento dei documenti.`;
  return sendEmail({ to, subject, text });
}

/**
 * Reminder scadenza documento (30 / 7 / 1 giorno)
 */
export async function sendDocExpiryReminder({
  to,
  documentName,
  daysLeft,
}: {
  to: string;
  documentName: string;
  daysLeft: number;
}) {
  const subject =
    daysLeft <= 1
      ? `[Documento in scadenza] ${documentName} scade domani`
      : `[Promemoria] ${documentName} scade tra ${daysLeft} giorni`;
  const text = `Il documento "${documentName}" scadra tra ${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"}.\n\nRichiedi una versione aggiornata e caricala sul portale prima della scadenza.`;
  return sendEmail({ to, subject, text });
}

/**
 * Reminder documenti mancanti con scadenza bando entro 14 giorni
 */
export async function sendMissingDocsReminder({
  to,
  grantTitle,
  missingCount,
  daysToDeadline,
}: {
  to: string;
  grantTitle: string;
  missingCount: number;
  daysToDeadline: number;
}) {
  const subject = `[Documenti mancanti] ${grantTitle} — ${missingCount} documenti da caricare`;
  const text = `La pratica per il bando "${grantTitle}" ha ${missingCount} document${missingCount === 1 ? "o" : "i"} ancora da caricare. La scadenza del bando e tra ${daysToDeadline} giorni.\n\nAccedi al portale per completare i documenti.`;
  return sendEmail({ to, subject, text });
}

/**
 * Reminder Click Day imminente (7 / 3 / 1 giorno)
 */
export async function sendClickDayReminder({
  to,
  grantTitle,
  daysLeft,
}: {
  to: string;
  grantTitle: string;
  daysLeft: number;
}) {
  const subject =
    daysLeft <= 1
      ? `[Click Day domani] ${grantTitle}`
      : `[Click Day tra ${daysLeft} giorni] ${grantTitle}`;
  const text = `Il Click Day per il bando "${grantTitle}" e previsto tra ${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"}.\n\nAssicurati che tutti i documenti siano approvati e che la richiesta a MouseX sia stata inviata.`;
  return sendEmail({ to, subject, text });
}

/**
 * Reminder aggregato per consulente: documenti UPLOADED in attesa di revisione > 3 giorni
 */
export async function sendPendingReviewReminder({
  to,
  pendingCount,
  oldestDaysAgo,
}: {
  to: string;
  pendingCount: number;
  oldestDaysAgo: number;
}) {
  const subject = `[Documenti in attesa] ${pendingCount} document${pendingCount === 1 ? "o" : "i"} da revisionare`;
  const text = `Hai ${pendingCount} document${pendingCount === 1 ? "o" : "i"} in attesa di revisione. Il piu vecchio e stato caricato ${oldestDaysAgo} giorni fa.\n\nAccedi al portale per completare la revisione.`;
  return sendEmail({ to, subject, text });
}

export async function sendClientInviteEmail({
  to,
  consultantName,
  link,
}: {
  to: string;
  consultantName: string;
  link: string;
}) {
  return sendEmail({
    to,
    subject: `${consultantName} ti ha invitato su FinAgevolata`,
    text: `Ciao,

${consultantName} ti ha invitato a collaborare su FinAgevolata — la piattaforma dove consulente e azienda lavorano insieme sui bandi di finanza agevolata.

Clicca il link per creare l'account (scade in 7 giorni):
${link}

Se non conosci ${consultantName}, ignora questa email.
`,
  });
}

export async function sendWelcomeEmail({
  to,
  name,
  role,
}: {
  to: string;
  name: string;
  role: "COMPANY" | "CONSULTANT";
}) {
  const baseUrl = getBaseUrl();
  const subject =
    role === "CONSULTANT"
      ? "Benvenuto su FinAgevolata, consulente"
      : "Benvenuto su FinAgevolata";
  const ctaUrl =
    role === "CONSULTANT" ? `${baseUrl}/onboarding/consulente` : `${baseUrl}/onboarding`;
  const ctaLabel = role === "CONSULTANT" ? "Configura lo studio" : "Completa il profilo";
  const text = `Ciao ${name},

Grazie per esserti registrato su FinAgevolata.

Ti bastano 2 minuti per finire il setup: ${ctaLabel} → ${ctaUrl}

Se hai domande, rispondi a questa email.
`;
  return sendEmail({ to, subject, text });
}

/**
 * Notifica tutti gli ADMIN_EMAILS che un consulente ha proposto un nuovo bando
 */
export async function sendGrantSubmittedEmail({
  consultantName,
  grantTitle,
}: {
  consultantName: string;
  grantTitle: string;
}) {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    console.warn("sendGrantSubmittedEmail: ADMIN_EMAILS non configurato, skip.");
    return { success: false, error: "No ADMIN_EMAILS" };
  }
  const baseUrl = getBaseUrl();
  const text = `${consultantName} ha proposto un nuovo bando: "${grantTitle}".

Vai alla coda approvazioni: ${baseUrl}/admin/bandi/queue
`;
  return sendEmail({
    to: adminEmails.join(","),
    subject: `[FinAgevolata] Nuovo bando da approvare: ${grantTitle}`,
    text,
  });
}

/**
 * Notifica il consulente che il bando proposto è stato rifiutato
 */
export async function sendGrantRejectedEmail({
  to,
  consultantName,
  grantTitle,
  reason,
}: {
  to: string;
  consultantName: string;
  grantTitle: string;
  reason: string;
}) {
  const text = `Ciao ${consultantName},

Il bando che hai proposto — "${grantTitle}" — non è stato approvato per il seguente motivo:

"${reason}"

Puoi riproporlo con le modifiche necessarie.
`;
  return sendEmail({
    to,
    subject: `Bando "${grantTitle}" non approvato`,
    text,
  });
}

export async function sendClickDayRequestEmail({
  to,
  cc,
  grantTitle,
  companyName,
  text,
}: {
  to: string;
  cc?: string;
  grantTitle: string;
  companyName: string;
  text: string;
}) {
  const subject = `[Click Day] ${grantTitle} — ${companyName}`;
  return sendEmail({ to, ...(cc ? { cc } : {}), subject, text });
}
