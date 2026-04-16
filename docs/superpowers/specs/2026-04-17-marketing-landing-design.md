# Marketing Landing — Design Spec

**Date:** 2026-04-17
**Module:** A — Marketing/Landing pubblico (sequenza A→B→C→D→E)
**Status:** Approved, ready for plan

---

## 1. Context

FinAgevolata è un SaaS bidirezionale che collega consulenti di finanza agevolata e aziende italiane. L'app (portali consulente / azienda / admin, auth, documenti, bandi, Click Day) è già costruita e deployata su Vercel. Manca un sito marketing pubblico per vendere il prodotto.

Questo spec definisce il **Modulo A**: mini marketing site pubblico (4 pagine: home, features, prezzi, contatti) con narrazione "ponte" unificata per entrambi i target (consulenti + aziende).

**Fuori scope (moduli successivi):**
- Pagamenti Stripe / billing → Modulo B
- Polish UX portali autenticati → Modulo C
- Audit sicurezza / RLS → Modulo D
- Monitoring, Sentry, SEO avanzato → Modulo E

## 2. Goals

- Landing pubblica pronta a ricevere traffico commerciale entro prossimo deploy
- Messaggio differenziante "ponte bidirezionale" (unico vs Bandit/Muffin/Jump)
- CTA primaria: signup piano Free (conversione immediata, no friction pagamento)
- Trust: partnership MouseX + statistiche settore reali (no testimonial finti)

## 3. Architettura Rotte

```
apps/web/app/
├── (marketing)/              # NEW — route group pubblico
│   ├── layout.tsx            # Header pubblico + footer
│   ├── page.tsx              # /
│   ├── features/page.tsx     # /features
│   ├── prezzi/page.tsx       # /prezzi
│   ├── contatti/page.tsx     # /contatti
│   ├── privacy/page.tsx      # /privacy
│   ├── termini/page.tsx      # /termini
│   └── cookie/page.tsx       # /cookie
├── (auth)/                   # existing
├── (dashboard)/              # existing
├── api/
│   └── contact/route.ts      # NEW? or Server Action (preferred)
├── opengraph-image.tsx       # NEW — OG image generator
├── robots.ts                 # NEW
├── sitemap.ts                # NEW
└── layout.tsx                # existing root
```

**Decisioni:**
- `(marketing)` route group → organizza senza modificare URL
- URL in italiano per SEO locale (`/prezzi`, `/contatti`, `/termini`)
- Middleware esistente: aggiungere redirect da `/` a dashboard se utente loggato (verso `/consulente` o `/azienda` in base a ruolo)
- Header pubblico separato da header app autenticata
- Form contact via **Server Action** (no API route) — semplifica, tipo-safe, no CSRF manuale

## 4. Contenuto Pagine

### 4.1 `/` Homepage (narrative ponte)

Sezioni in ordine:

1. **Hero**
   - H1: "La piattaforma dove consulenti e aziende lavorano insieme sui bandi"
   - Sub: "Finanza agevolata senza Excel, senza email perse, senza documenti in ritardo."
   - CTA primaria: "Inizia gratis" → `/register?plan=free`
   - CTA secondaria: "Vedi come funziona" → scroll a sezione 3
   - Visual: screenshot/mockup dashboard ponte (consulente ⇄ azienda)
   - Background: gradient indigo animato sottile (CSS-only)

2. **Problema (stat settore)**
   - 3 colonne con numero grande + label:
     - "70%" — domande respinte per documenti incompleti
     - "15-20 min" — tempo medio esaurimento fondi Click Day
     - "300.000€" — soglia de minimis aiuti 3 anni (Reg. UE 2023/2831)
   - Citazione fonti dove rilevante

3. **Come funziona (3 step)**
   - Step 1: "Collega consulente e azienda" — workspace condiviso creato in 30s
   - Step 2: "Checklist dinamica per bando" — il sistema dice cosa serve, quando scade
   - Step 3: "Invio assistito (incluso Click Day)" — integrazione MouseX nativa
   - Visual: diagramma a tre step con connector frecce

4. **Features highlight (6 card grid)**
   - Checklist dinamica per bando
   - Validazione documenti proattiva (scadenze DURC, visure, ecc.)
   - Ponte bidirezionale (workspace condiviso consulente ⇄ azienda)
   - Matching bando ↔ profilo azienda (settore, dimensione, territorio)
   - Integrazione Click Day (MouseX partner)
   - Onboarding automatico P.IVA → dati CCIAA

5. **Per chi è**
   - 2 colonne affiancate:
     - "Sei un consulente?" — 4 bullet benefici (dashboard multi-cliente, riduzione email, Click Day integrato, compliance automatica)
     - "Sei un'azienda?" — 4 bullet (sai cosa caricare, non perdi scadenze, lavori col tuo consulente, massimizzi successo)
   - **UNICA CTA sotto**: "Prova gratis" (no split, convergenza)

6. **Partner + trust**
   - Badge "Integrato con MouseX" con logo
   - 1 paragrafo breve: MouseX è il partner Click Day di riferimento per bandi INAIL, Sabatini, Transizione 4.0
   - Logo MouseX linkato a www.mousex.it

7. **FAQ (5 domande)**
   - Quanto costa FinAgevolata? → link /prezzi
   - Posso invitare i miei clienti / il mio consulente sulla piattaforma?
   - Come funziona l'integrazione Click Day con MouseX?
   - I dati dei documenti sono sicuri? (GDPR, encryption at rest, RLS)
   - Posso cancellare l'account in qualsiasi momento?

8. **CTA finale**
   - "Pronto a semplificare la gestione bandi?"
   - Bottone primario "Inizia gratis" + link "Parla con noi" → /contatti

### 4.2 `/features`

Una sezione per feature (6 sezioni + hero) con:
- Screenshot / mockup della feature
- Descrizione estesa (150-200 parole)
- Bullet list benefici concreti
- Anchor link da homepage (`/features#checklist-dinamica`)

Chiusura pagina: CTA banner "Prova gratis".

### 4.3 `/prezzi`

- Hero breve: "Un piano per ogni dimensione"
- Toggle: Mensile / Annuale (sconto 20% annuale visibile)
- Tabella 4 piani in riga:
  - **Free** — 0€ — "Azienda singola che vuole provare"
  - **Pro Azienda** — 39€/mese (31€ annuale) — "PMI con più bandi attivi"
  - **Consulente** — 149€/mese (119€ annuale) — BADGE "Più scelto" — "Freelance o studio fino a 20 clienti"
  - **Studio** — 399€/mese (319€ annuale) — "Studi strutturati, clienti illimitati, team"
- Per ogni piano: CTA "Inizia gratis" → `/register?plan=<slug>` (tutti i piani passano da signup Free, upgrade in-app in fase B)
- Tabella confronto feature completa sotto (righe: bandi attivi, clienti gestibili, Click Day add-on, team members, white-label, API, storage GB, support level)
- FAQ pricing specifica:
  - Come si fattura? (IVA inclusa/esclusa?)
  - Posso cambiare piano?
  - Disdetta come funziona?
  - C'è commitment annuale?

### 4.4 `/contatti`

- Form con campi: nome, email, ruolo (select: Consulente / Azienda / Altro), messaggio, piano interesse (opzionale, pre-fillato da query param)
- Validazione client + server (Zod)
- Submit → Server Action `submitContact`
- Email diretta visibile: `info@finagevolata.it`
- Link WhatsApp business (se disponibile)
- Rate limit: 1 submit per IP ogni 60 secondi (header `x-forwarded-for`)
- Success state: thank-you message inline, no redirect

### 4.5 Legal (`/privacy`, `/termini`, `/cookie`)

Pagine statiche con template GDPR base, link in footer. Contenuto: placeholder con struttura reale da far completare a legale prima del go-live (flag `TODO legal review` in commenti).

## 5. Design System

**Stack riuso:** Tailwind CSS v4 + shadcn/ui + lucide-react + tw-animate-css.

**Palette:**
| Token | Valore | Uso |
|-------|--------|-----|
| primary | `#6366F1` indigo-500 | CTA, link, brand |
| primary-dark | `#4F46E5` indigo-600 | hover CTA |
| accent | `#10B981` emerald-500 | success, connection/ponte visual |
| bg-default | `#FFFFFF` | sezioni chiare |
| bg-alt | `#FAFAFA` slate-50 | sezioni alternate |
| bg-dark | `#0F172A` slate-900 | footer, hero alt |
| text-heading | `#0F172A` | H1-H3 |
| text-body | `#475569` slate-600 | paragrafi |
| border | `#E2E8F0` slate-200 | divisori, card |

**Tipografia:**
- Font: `Inter` variable (Google Fonts, subset latin)
- Display (hero H1): 56px mobile / 72px desktop, weight 700, tracking -0.02em
- H2: 36px / 48px, weight 700
- H3: 24px / 32px, weight 600
- Body: 16px / 18px, weight 400, line-height 1.6
- Caption: 14px, slate-500

**Componenti nuovi in `components/marketing/`:**
- `marketing-header.tsx` — nav sticky, blur backdrop, CTA destra
- `marketing-footer.tsx` — 4 colonne (prodotto / risorse / legal / contatti) + MouseX badge
- `hero-section.tsx` — hero riutilizzabile (slot content)
- `feature-card.tsx` — icon + titolo + desc, hover lift
- `stat-block.tsx` — numero grande + label + optional source
- `pricing-table.tsx` — 4 colonne con toggle mensile/annuale (client component, state locale)
- `pricing-comparison.tsx` — tabella comparativa feature sotto pricing
- `faq-accordion.tsx` — accordion (Base UI Disclosure, già in stack `@base-ui/react`)
- `cta-banner.tsx` — banner CTA riutilizzabile
- `bridge-diagram.tsx` — visual consulente ⇄ azienda (SVG inline)
- `contact-form.tsx` — form (client component, Zod + Server Action)

**Animazioni:**
- `tw-animate-css` fade-in on scroll (classe `.animate-fade-in-up`)
- Hover card: `hover:shadow-lg hover:-translate-y-0.5 transition-all`
- Gradient hero animato (keyframe CSS background-position)
- No framer-motion → evitiamo bundle size extra

**Responsive:**
- Mobile-first, breakpoint `md:` 768px, `lg:` 1024px
- Header: hamburger sotto `md:`
- Pricing table: stack verticale sotto `md:`
- Hero: testo center sotto `md:`, left desktop
- Visual hero: sotto testo su mobile

## 6. Integrazione con App Esistente

**Signup con piano via query param:**
- CTA landing: `/register?plan=free|pro-azienda|consulente|studio`
- `Register` page (esistente) legge `searchParams.plan`, valida contro enum
- Dopo submit register → passa plan a `onboarding?plan=<x>`
- Onboarding:
  - `plan=free|pro-azienda` → forza ruolo `AZIENDA` (skip step scelta ruolo)
  - `plan=consulente|studio` → forza ruolo `CONSULENTE`
  - No query param → step scelta ruolo come oggi

**Prisma schema change:**
```prisma
enum PlanType {
  FREE
  PRO_AZIENDA
  CONSULENTE
  STUDIO
}

model User {
  // ...existing fields
  plan PlanType @default(FREE)
}

model ContactLead {
  id        String   @id @default(cuid())
  name      String
  email     String
  role      String   // "consulente" | "azienda" | "altro"
  message   String   @db.Text
  plan      String?  // opzionale, da ?plan param
  ipHash    String   // hash SHA-256 IP (per rate limit senza tracciare PII)
  createdAt DateTime @default(now())
  @@index([email])
  @@index([createdAt])
}
```

Migration: `pnpm --filter @finagevolata/db prisma:migrate` → nome `add_plan_and_contact_lead`.

**Contact form Server Action** (`app/(marketing)/contatti/actions.ts`):
```typescript
'use server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { headers } from 'next/headers';
import crypto from 'crypto';

const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['consulente', 'azienda', 'altro']),
  message: z.string().min(10).max(2000),
  plan: z.string().optional(),
});

export async function submitContact(input: unknown) {
  const parsed = ContactSchema.parse(input);
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

  // Rate limit: 1 submit / IP / 60s
  const recent = await prisma.contactLead.findFirst({
    where: { ipHash, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent) throw new Error('Troppi tentativi. Riprova tra un minuto.');

  await prisma.contactLead.create({ data: { ...parsed, ipHash } });
  await sendEmail({
    to: process.env.CONTACT_EMAIL_TO ?? 'info@finagevolata.it',
    subject: `[Contact] ${parsed.name} (${parsed.role})`,
    text: `Da: ${parsed.name} <${parsed.email}>\nRuolo: ${parsed.role}\nPiano: ${parsed.plan ?? '-'}\n\n${parsed.message}`,
  });
  return { ok: true };
}
```

**Env vars nuove:**
- `CONTACT_EMAIL_TO` — email destinazione lead (default `info@finagevolata.it`)

Aggiungere a `turbo.json` env list.

**Middleware update** (`apps/web/middleware.ts`, esistente):
- Aggiungere regola: se utente autenticato visita `/` → redirect a `/consulente` (ruolo consulente/admin) o `/azienda` (ruolo azienda)
- Rotte pubbliche `/features`, `/prezzi`, `/contatti`, `/privacy`, `/termini`, `/cookie`, `/login`, `/register` accessibili a tutti

## 7. SEO / Metadata

**Per pagina `generateMetadata`:**

| Path | Title | Description |
|------|-------|-------------|
| `/` | "FinAgevolata — Piattaforma bandi per consulenti e aziende" | "Gestisci bandi, documenti e Click Day in un'unica piattaforma. Consulenti e aziende lavorano insieme. Prova gratis." |
| `/features` | "Funzionalità — FinAgevolata" | "Checklist dinamica, validazione proattiva, Click Day MouseX, matching bando-azienda. Scopri tutte le features." |
| `/prezzi` | "Prezzi — FinAgevolata" | "Piani da 0€ (Free) a 399€/mese (Studio). Senza commitment. Inizia gratis ora." |
| `/contatti` | "Contatti — FinAgevolata" | "Parla con il team. Demo personalizzata per consulenti e aziende." |

**Aggiuntivo:**
- `app/sitemap.ts` dinamico — include tutte le rotte pubbliche (escluse `(auth)` e `(dashboard)`)
- `app/robots.ts` — permetti `/`, `/features`, `/prezzi`, `/contatti`, `/privacy`, `/termini`, `/cookie`, blocca `/api`, `/admin`, `/consulente`, `/azienda`, `/onboarding`
- `app/opengraph-image.tsx` — OG image 1200x630 generata runtime (gradient + logo + H1)
- JSON-LD `SoftwareApplication` schema inline in homepage
- `lang="it"` su `<html>` (già presente)
- Canonical URL via metadata `alternates.canonical`
- Favicon `.ico` + `apple-touch-icon.png` in `app/`

## 8. Testing

**Unit / Integration (Vitest):**
- `submitContact` — validazione Zod (input invalidi rejected), rate limit (2 submit stesso IP in 30s → secondo rejected), save lead + send email call
- `PlanType` signup redirect logic — arriva con `?plan=consulente` → redirect a onboarding consulente

**Manual / E2E smoke (pre-deploy):**
- Hero CTA "Inizia gratis" → `/register?plan=free` carica
- Pricing CTA per ogni piano → signup con plan corretto
- Contact form submit → email ricevuta su `CONTACT_EMAIL_TO` + lead salvato in DB
- Responsive: visualizzazione corretta a 375px, 768px, 1024px, 1440px
- Utente loggato visita `/` → redirect corretto a dashboard
- Lighthouse (Chrome DevTools) — target: Performance ≥90, Accessibility ≥95, SEO 100

## 9. Launch Checklist

- [ ] 4 pagine marketing + 3 legal deployate
- [ ] Middleware aggiornato per redirect utente loggato
- [ ] Prisma migration applicata (User.plan + ContactLead)
- [ ] `CONTACT_EMAIL_TO` configurata su Vercel
- [ ] Sitemap.xml e robots.txt accessibili
- [ ] Favicon + opengraph-image visibili
- [ ] Lighthouse score ≥90 su tutte le pagine marketing
- [ ] OG preview testata su opengraph.xyz o Twitter Card Validator
- [ ] Cookie banner minimale (solo cookie essenziali, no banner se no tracking)
- [ ] Legal pages: flag `TODO legal review` prima di considerare produzione-ready
- [ ] Vercel Analytics attivo
- [ ] Contact form e2e testato con email reale

## 10. Fuori Scope (Esplicito)

- **Pagamento effettivo Stripe** — Modulo B
- **Piani pagati attivi** — in A tutti i piani portano a signup Free; upgrade in-app arriva in B
- **Blog / case studies / contenuti SEO long-form** — rinviati (il nostro mini-site è 4 pagine)
- **A/B testing framework** — non necessario al lancio
- **Internazionalizzazione** — solo italiano
- **Dark mode marketing** — solo light mode (consistenza con target B2B Italia)
- **Cookie banner avanzato (OneTrust/Cookiebot)** — banner minimale only-essential basta finché non aggiungiamo tracking non-essenziale
- **Testimonial / case study reali** — esplicitamente NO testimonial finti; se reali arriveranno dopo lancio, da aggiungere in iterazione

## 11. Open Questions

- [ ] Logo finale FinAgevolata disponibile? Altrimenti placeholder wordmark
- [ ] Dominio produzione (`finagevolata.it`?) — serve per URL canonical e email
- [ ] Email `info@finagevolata.it` configurata su Resend domain? Verificare DNS
- [ ] Testo legale privacy/termini: chi scrive? (consigliato template base + review legale prima del go-live)
- [ ] Link WhatsApp business su `/contatti` attivabile? (richiede numero verificato)
