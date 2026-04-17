// apps/web/lib/email.ts
import { Resend } from "resend";

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
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
 * Notifica l'azienda che un bando scade a breve
 */
export async function sendGrantDeadlineAlert(companyEmail: string, grantTitle: string, deadline: string) {
    return sendEmail({
        to: companyEmail,
        subject: `[Scadenza Bando] ${grantTitle}`,
        text: `Il bando "${grantTitle}" scade il ${deadline}. Completa il caricamento dei documenti per non perdere l'opportunità.`
    });
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
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://axentraitalia.cloud";
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
