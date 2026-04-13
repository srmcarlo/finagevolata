# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Progetto: FinAgevolata SaaS

Piattaforma SaaS che fa da ponte tra **consulenti di finanza agevolata** e **aziende italiane** che vogliono accedere a bandi pubblici (nazionali, regionali, PNRR, INAIL, Invitalia, ecc.). Il sistema gestisce il ciclo di vita completo: dalla scoperta del bando alla presentazione della domanda, inclusa l'integrazione con servizi esterni di Click Day.

---

## Architettura ad Alto Livello

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                     │
│  Portal Consulente  │  Portal Azienda  │  Admin Dashboard   │
└──────────┬──────────┴────────┬─────────┴──────────┬─────────┘
           │                   │                    │
┌──────────▼───────────────────▼────────────────────▼─────────┐
│                    API GATEWAY / BFF                         │
│              (Auth, Rate Limiting, Routing)                  │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                     BACKEND (Node.js / NestJS)              │
│                                                              │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Auth &   │ │ Gestione     │ │ Gestione     │            │
│  │ Ruoli    │ │ Documenti    │ │ Bandi        │            │
│  └──────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Matching │ │ Notifiche    │ │ Click Day    │            │
│  │ Bando ↔  │ │ & Scadenze   │ │ Integration  │            │
│  │ Azienda  │ └──────────────┘ └──────────────┘            │
│  └──────────┘                                               │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────┐  ┌────────────────┐  ┌──────────────┐
│  PostgreSQL (dati)  │  │  Object Storage │  │  Redis       │
│  + pgvector         │  │  (documenti)    │  │  (cache/jobs)│
└─────────────────────┘  └────────────────┘  └──────────────┘
```

### Tre portali, un backend

| Portale | Utente | Funzione principale |
|---------|--------|---------------------|
| **Portal Consulente** | Consulente/studio | Gestisce N clienti, verifica documenti, compila domande, monitora scadenze |
| **Portal Azienda** | Impresa/PMI | Carica documenti, vede stato pratiche, riceve richieste dal consulente |
| **Admin Dashboard** | Operatore piattaforma | Gestione bandi, utenti, analytics, configurazioni |

---

## Dominio: Finanza Agevolata Italiana

### Cos'è
La finanza agevolata comprende contributi a fondo perduto, finanziamenti agevolati, crediti d'imposta e garanzie pubbliche destinati alle imprese italiane tramite bandi pubblici (MISE, Invitalia, Regioni, INAIL, UE/PNRR).

### Il problema che risolviamo
- **70% delle domande viene respinto** per documentazione incompleta o non conforme
- I consulenti gestiscono manualmente decine di pratiche con Excel e email
- Le aziende non sanno quali documenti servono e li consegnano in ritardo o sbagliati
- Il Click Day richiede velocità estrema (fondi esauriti in 15-20 minuti)

### Documenti standard richiesti dai bandi

Ogni bando ha requisiti specifici, ma esiste un set comune che la piattaforma deve gestire:

| # | Documento | Descrizione | Validità/Note |
|---|-----------|-------------|---------------|
| 1 | **Visura Camerale** | Certificato CCIAA con dati legali dell'impresa | Max 6 mesi dalla presentazione |
| 2 | **DURC** | Documento Unico Regolarità Contributiva (INPS/INAIL) | 120 giorni, richiesta gratuita su portale INPS |
| 3 | **DSAN** | Dichiarazione Sostitutiva di Atto Notorio | Autocertificazione stati/fatti |
| 4 | **Bilanci** | Ultimi 2-3 esercizi depositati | Devono essere depositati in CCIAA |
| 5 | **Business Plan** | Piano d'impresa con proiezioni finanziarie | Specifico per il progetto del bando |
| 6 | **Dichiarazione de minimis** | Attesta aiuti di stato ricevuti negli ultimi 3 anni | Reg. UE 2023/2831, soglia 300.000 EUR |
| 7 | **Preventivi fornitori** | Almeno 2-3 preventivi comparativi per ogni voce di spesa | Firmati e su carta intestata |
| 8 | **Dichiarazione Antimafia** | Certificato Prefettura per contributi > 150.000 EUR | Tempi rilascio: ~45 giorni |
| 9 | **Dichiarazione Antiriciclaggio** | Identifica titolari effettivi (>25% capitale) | Obbligo normativo |
| 10 | **Contabilità Separata** | Impegno a codifica separata spese progetto | Tracciabilità fondi pubblici |
| 11 | **Documento identità** | Legale rappresentante | In corso di validità |
| 12 | **Firma digitale** | Del legale rappresentante | Necessaria per invio telematico |
| 13 | **Codice ATECO** | Classificazione attività economica | Deve rientrare nei settori ammessi dal bando |
| 14 | **Dichiarazioni fiscali** | Ultime dichiarazioni dei redditi | Regolarità fiscale |
| 15 | **Certificazioni specifiche** | ISO, SOA, ambientali, ecc. | Dipendono dal bando |

### Tempistiche di preparazione documenti
- **45+ giorni prima**: Certificazione antimafia
- **30 giorni prima**: Bilanci, DURC, Visura camerale
- **15 giorni prima**: Business plan, preventivi
- **7 giorni prima**: Caricamento piattaforma e test tecnici

### Click Day
Procedura di assegnazione fondi in ordine cronologico di arrivo. Il giorno X, all'ora Y, si apre il portale e chi invia prima ottiene il contributo. Servizi specializzati ("cliccatori") garantiscono velocità di invio. L'integrazione con partner di Click Day è una feature chiave.

---

## Moduli Funzionali

### 1. Autenticazione e Ruoli
- **Ruoli**: Admin, Consulente, Azienda, Operatore Click Day
- Auth con JWT + refresh token, MFA obbligatoria per consulenti
- SPID/CIE integration (futuro) per verifica identità aziendale
- Onboarding guidato per aziende (inserimento P.IVA → auto-compilazione dati da API CCIAA)

### 2. Gestione Documenti (core)
- Upload documenti con validazione formato/dimensione
- **Checklist dinamica per bando**: il sistema genera la lista documenti necessari in base al bando selezionato
- **Stato documento**: mancante / caricato / in revisione / approvato / rifiutato (con motivo)
- Scadenza automatica (es. DURC > 120 giorni → alert)
- Versioning: storico delle versioni per ogni documento
- Il consulente vede una dashboard con: documenti OK, documenti mancanti, documenti da correggere per ciascun cliente
- OCR/AI per estrazione dati da documenti caricati (es. leggere P.IVA da visura)

### 3. Gestione Bandi
- Database bandi con: ente, scadenza, requisiti, importo, settori ATECO ammessi, documenti richiesti
- Aggiornamento periodico (scraping o feed da fonti ufficiali: MISE, Invitalia, regioni)
- **Matching automatico** bando ↔ profilo azienda (settore, dimensione, localizzazione, requisiti)
- Timeline per bando con fasi: pubblicazione → scadenza → esito

### 4. Relazione Consulente-Azienda
- Un consulente gestisce N aziende
- Workspace condiviso per pratica (bando + azienda)
- Chat/messaggistica interna per pratica
- Il consulente può richiedere documenti specifici all'azienda (notifica push/email)
- L'azienda vede solo i propri dati e pratiche

### 5. Integrazione Click Day
- API per partner esterni che gestiscono il Click Day
- Flusso: pratica pronta → conferma consulente → invio dati al partner Click Day → tracking esito
- Dashboard stato Click Day: in attesa / inviato / posizione in graduatoria / esito

### 6. Notifiche e Scadenze
- Scadenze bandi, scadenze documenti, richieste consulente
- Email + notifiche in-app + (futuro) push mobile
- Reminder progressivi: 30/15/7/1 giorno prima

### 7. Analytics e Reportistica
- Per consulente: n. pratiche, tasso successo, revenue stimata
- Per admin: metriche piattaforma, bandi più richiesti, conversioni
- Per azienda: storico pratiche, contributi ottenuti

---

## Stack Tecnologico Consigliato

| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| Frontend | **Next.js 15 + React 19** | SSR, App Router, ottimo per SEO landing pages + dashboard SPA |
| UI | **Tailwind CSS + shadcn/ui** | Design system consistente, veloce da sviluppare |
| Backend | **NestJS (Node.js)** | Modulare, TypeScript nativo, ottimo per API REST + WebSocket |
| Database | **PostgreSQL + Prisma** | Relazionale robusto, Prisma per type-safe ORM |
| Storage | **S3-compatible (MinIO / AWS S3)** | Documenti aziendali, con presigned URLs |
| Auth | **NextAuth.js o Clerk** | Multi-tenant, supporto OAuth/SPID futuro |
| Cache/Queue | **Redis + BullMQ** | Job queue per notifiche, scadenze, scraping bandi |
| Search | **pgvector o Meilisearch** | Ricerca full-text bandi + matching semantico |
| Realtime | **WebSocket (Socket.io)** | Chat consulente-azienda, notifiche live |
| AI/OCR | **Tesseract / OpenAI Vision** | Estrazione dati da documenti scansionati |
| Deploy | **Docker + Vercel (FE) / Railway o Fly.io (BE)** | Scalabile, costi contenuti in fase iniziale |
| CI/CD | **GitHub Actions** | Test, lint, deploy automatici |

---

## Struttura Progetto (monorepo)

```
Proggetto_finanza_agevolata/
├── apps/
│   ├── web/                    # Next.js frontend (tutti i portali)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, registrazione, onboarding
│   │   │   ├── (consulente)/   # Dashboard consulente
│   │   │   ├── (azienda)/      # Dashboard azienda
│   │   │   └── (admin)/        # Pannello admin
│   │   └── ...
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── auth/           # Autenticazione e autorizzazione
│       │   ├── users/          # Gestione utenti e ruoli
│       │   ├── documents/      # Upload, validazione, versioning documenti
│       │   ├── bandi/          # CRUD bandi, matching, scraping
│       │   ├── practices/      # Pratiche (bando + azienda + documenti)
│       │   ├── notifications/  # Email, push, in-app
│       │   ├── clickday/       # Integrazione partner Click Day
│       │   ├── chat/           # Messaggistica consulente-azienda
│       │   └── analytics/      # Reportistica e metriche
│       └── ...
├── packages/
│   ├── shared/                 # Tipi TypeScript condivisi, costanti, utils
│   ├── ui/                     # Componenti UI condivisi (design system)
│   └── db/                     # Schema Prisma, migrations, seed
├── docker/                     # Docker Compose per sviluppo locale
├── docs/                       # Documentazione tecnica e di dominio
├── .github/                    # CI/CD workflows
├── turbo.json                  # Turborepo config
└── package.json                # Workspace root
```

---

## Comandi di Sviluppo

```bash
# Setup iniziale
pnpm install

# Avvio sviluppo (tutti i servizi)
pnpm dev

# Solo frontend
pnpm --filter web dev

# Solo backend
pnpm --filter api dev

# Database
pnpm --filter db prisma:migrate     # Esegui migrations
pnpm --filter db prisma:generate    # Genera client Prisma
pnpm --filter db prisma:seed        # Seed dati iniziali (bandi demo)
pnpm --filter db prisma:studio      # GUI database

# Test
pnpm test                           # Tutti i test
pnpm --filter api test              # Solo test backend
pnpm --filter web test              # Solo test frontend
pnpm --filter api test -- --grep "documents"  # Test singolo modulo

# Lint e format
pnpm lint
pnpm format

# Build produzione
pnpm build

# Docker (sviluppo locale con DB + Redis + MinIO)
docker compose up -d
```

---

## Analisi Competitiva

### Concorrenti diretti in Italia

| Piattaforma | Focus | Punti di forza | Limiti / Gap |
|-------------|-------|----------------|--------------|
| **[Bandit](https://getbandit.it)** | Generazione automatica documenti per bandi | AI per auto-compilazione, 110+ studi consulenza, riduzione tempi 40% | Focus su generazione docs, meno su relazione consulente-azienda |
| **[Muffin](https://getmuffin.io)** | Marketplace consulenti ↔ aziende | Rete 200+ consulenti certificati, matching AI | Più marketplace che tool operativo, meno gestione documentale |
| **[Jump (Sinergest)](https://jumpsoftware.it)** | Project management per consulenti | Gestione completa pratiche, scadenze, team | Focus solo lato consulente, l'azienda non ha un portale |
| **[Finera](https://finera.it)** | Consulenza + contenuti | Brand forte, contenuti educativi | Più servizio consulenziale che piattaforma SaaS |
| **[Incentivimpresa](https://incentivimpresa.it)** | Contenuti + AI monitoring | Guide dettagliate, AI per monitoraggio | Più informativo che operativo |

### Il nostro differenziale

1. **Ponte bidirezionale**: unica piattaforma dove sia il consulente che l'azienda hanno un portale attivo con visibilità condivisa sui documenti
2. **Checklist dinamica intelligente**: per ogni bando, il sistema sa esattamente quali documenti servono e il loro stato per ogni azienda
3. **Validazione proattiva**: alert automatici su documenti scaduti, mancanti, o non conformi PRIMA della deadline
4. **Integrazione Click Day nativa**: collegamento diretto con partner di Click Day (unico nel mercato)
5. **Onboarding automatico**: inserisci P.IVA → il sistema compila automaticamente profilo, codice ATECO, dati camerali
6. **Multi-bando per azienda**: un'azienda può seguire più bandi in parallelo, riutilizzando documenti già caricati

---

## Idee per Evoluzione Futura

### Fase 2 - AI e Automazione
- **AI Document Checker**: analisi automatica qualità documenti (es. "il bilancio caricato è del 2023, serve il 2024")
- **Auto-fill domande**: AI che precompila i moduli del bando dai dati aziendali
- **Scoring predittivo**: probabilità di successo per ogni bando in base al profilo azienda
- **Chatbot assistente**: per guidare l'azienda nella raccolta documenti

### Fase 3 - Crescita
- **Marketplace consulenti**: le aziende senza consulente possono trovarne uno sulla piattaforma
- **White-label per studi**: gli studi di consulenza possono avere la piattaforma col proprio brand
- **API pubblica**: altri software (commercialisti, CRM) possono integrarsi
- **Mobile app**: per notifiche push e upload foto documenti

### Fase 4 - Espansione
- **Integrazione SPID/CIE** per onboarding certificato
- **Connessione diretta a portali PA** (Invitalia, INAIL) per pre-compilazione
- **Modulo rendicontazione**: gestione post-agevolazione (giustificativi spesa)
- **Espansione UE**: bandi europei (Horizon, LIFE, ecc.)

---

## Modello di Business Suggerito

| Piano | Target | Prezzo indicativo | Caratteristiche |
|-------|--------|-------------------|-----------------|
| **Free** | Azienda singola | 0 EUR | 1 bando attivo, upload documenti, checklist base |
| **Pro Azienda** | PMI | 29-49 EUR/mese | Bandi illimitati, matching, notifiche, storico |
| **Consulente** | Studio/freelance | 99-199 EUR/mese | Fino a 20 clienti, dashboard multi-cliente, chat |
| **Studio** | Studi strutturati | 299-499 EUR/mese | Clienti illimitati, team, white-label, API |
| **Click Day Add-on** | Tutti | Pay-per-use | Integrazione partner Click Day per singolo bando |

---

## Convenzioni di Sviluppo

- **Lingua codice**: inglese (nomi variabili, funzioni, componenti)
- **Lingua UI/UX**: italiano (interfaccia utente)
- **Lingua documentazione tecnica**: inglese
- **Commit messages**: Conventional Commits in inglese (`feat:`, `fix:`, `docs:`, `chore:`)
- **Branch naming**: `feat/nome-feature`, `fix/nome-bug`, `chore/nome-task`
- **API**: RESTful, versionata (`/api/v1/...`), response JSON standard con `{ data, error, meta }`
- **Validazione**: Zod per schema validation condivisa frontend/backend
- **Env vars**: mai committate, usare `.env.example` come template

---

## Sicurezza

- I documenti aziendali sono dati sensibili: encrypt at rest (S3 SSE) + in transit (HTTPS)
- Accesso documenti solo tramite presigned URLs con scadenza breve
- Row-level security: un consulente vede solo i propri clienti, un'azienda solo le proprie pratiche
- Audit log su tutte le operazioni sui documenti
- GDPR compliance: consenso esplicito, diritto all'oblio, data retention policy
- Rate limiting su API pubbliche
- Input sanitization contro injection (SQL, XSS)
