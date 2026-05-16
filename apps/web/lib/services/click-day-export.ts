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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildClickDayEmailHtml(input: ClickDayEmailInput): string {
  const { grant, company, documents, consultant, notes, linkExpiry } = input;
  const clickDayLabel = grant.clickDayDate
    ? grant.clickDayDate.toLocaleString("it-IT")
    : "Da definire";
  const expiryLabel = linkExpiry.toLocaleString("it-IT");
  const hasNotes = notes.trim() !== "";

  const docRows = documents
    .map((d, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `<tr style="background:${bg};">
  <td style="padding:10px 12px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569;width:36px;">${i + 1}</td>
  <td style="padding:10px 12px;border-top:1px solid #e2e8f0;font-size:13px;color:#1e293b;">${escapeHtml(d.name)}</td>
  <td style="padding:10px 12px;border-top:1px solid #e2e8f0;font-size:13px;text-align:right;"><a href="${escapeHtml(d.url)}" style="color:#2563eb;text-decoration:underline;">Scarica</a></td>
</tr>`;
    })
    .join("");

  const notesHtml = hasNotes
    ? `<tr><td style="padding:0 24px 24px;">
        <div style="border-left:4px solid #6366f1;background:#eef2ff;padding:12px 14px;border-radius:4px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:.05em;color:#4338ca;text-transform:uppercase;margin-bottom:4px;">Note dal consulente</div>
          <div style="font-size:13px;color:#1e293b;line-height:1.55;white-space:pre-wrap;">${escapeHtml(notes.trim())}</div>
        </div>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Richiesta Click Day — ${escapeHtml(grant.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

      <tr>
        <td style="background:#4f46e5;padding:24px;">
          <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:.02em;">FinAgevolata</div>
          <div style="font-size:13px;color:#c7d2fe;margin-top:4px;">Richiesta Click Day</div>
        </td>
      </tr>

      <tr>
        <td style="padding:20px 24px 4px;">
          <div style="border:2px solid #f59e0b;background:#fef3c7;border-radius:6px;padding:16px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#92400e;text-transform:uppercase;margin-bottom:6px;">Click Day</div>
            <div style="font-size:18px;font-weight:700;color:#78350f;margin-bottom:10px;">${escapeHtml(clickDayLabel)}</div>
            <div style="font-size:14px;color:#451a03;line-height:1.5;">
              <strong>${escapeHtml(grant.title)}</strong><br>
              ${escapeHtml(company.companyName)}
            </div>
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding:20px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top" style="width:50%;padding-right:8px;">
                <div style="font-size:11px;font-weight:600;letter-spacing:.05em;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Bando</div>
                <div style="font-size:13px;color:#1e293b;line-height:1.6;">
                  <div><strong>${escapeHtml(grant.title)}</strong></div>
                  <div style="color:#64748b;margin-top:2px;">${escapeHtml(grant.issuingBody)}</div>
                </div>
              </td>
              <td valign="top" style="width:50%;padding-left:8px;">
                <div style="font-size:11px;font-weight:600;letter-spacing:.05em;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Azienda</div>
                <div style="font-size:13px;color:#1e293b;line-height:1.6;">
                  <div><strong>${escapeHtml(company.companyName)}</strong></div>
                  <div style="color:#64748b;margin-top:2px;">P.IVA ${escapeHtml(company.vatNumber)}</div>
                  <div style="color:#64748b;">${escapeHtml(company.legalForm)}</div>
                  <div style="color:#64748b;">${escapeHtml(company.atecoCode)} — ${escapeHtml(company.atecoDescription)}</div>
                  <div style="color:#64748b;">${escapeHtml(company.region)} (${escapeHtml(company.province)})</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:24px;">
          <div style="display:inline-block;background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;letter-spacing:.05em;padding:4px 10px;border-radius:9999px;text-transform:uppercase;margin-bottom:10px;">Documenti approvati: ${documents.length}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;border-collapse:separate;">
            <thead>
              <tr style="background:#4f46e5;">
                <th align="left" style="padding:10px 12px;font-size:11px;font-weight:600;color:#ffffff;letter-spacing:.05em;text-transform:uppercase;width:36px;">#</th>
                <th align="left" style="padding:10px 12px;font-size:11px;font-weight:600;color:#ffffff;letter-spacing:.05em;text-transform:uppercase;">Documento</th>
                <th align="right" style="padding:10px 12px;font-size:11px;font-weight:600;color:#ffffff;letter-spacing:.05em;text-transform:uppercase;">Link</th>
              </tr>
            </thead>
            <tbody>${docRows}</tbody>
          </table>
        </td>
      </tr>

      ${notesHtml}

      <tr>
        <td style="background:#f8fafc;padding:20px 24px;border-top:1px solid #e2e8f0;">
          <div style="font-size:11px;font-weight:600;letter-spacing:.05em;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Consulente di riferimento</div>
          <div style="font-size:13px;color:#1e293b;line-height:1.6;">
            <strong>${escapeHtml(consultant.name)}</strong><br>
            <a href="mailto:${escapeHtml(consultant.email)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(consultant.email)}</a>
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding:16px 24px;background:#fefce8;border-top:1px solid #fde68a;">
          <div style="font-size:12px;color:#854d0e;line-height:1.55;">
            <strong>Attenzione:</strong> i link ai documenti scadono il <strong>${escapeHtml(expiryLabel)}</strong>. Scarica i file prima della scadenza.
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding:16px 24px;background:#1e293b;color:#cbd5e1;font-size:11px;text-align:center;">
          FinAgevolata — Piattaforma finanza agevolata · Consulenti e aziende, insieme.
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
