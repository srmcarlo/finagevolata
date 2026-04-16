# FinAgevolata - Documentazione Tecnica del Portale

**Versione:** MVP 1.0  
**Data:** 15 Aprile 2026  
**Stack:** Next.js 15 + React 19 + Prisma + PostgreSQL (Supabase) + Tailwind CSS  

---

## Indice

1. [Panoramica del Progetto](#1-panoramica-del-progetto)
2. [Architettura e Stack Tecnologico](#2-architettura-e-stack-tecnologico)
3. [Struttura del Monorepo](#3-struttura-del-monorepo)
4. [Database Schema](#4-database-schema)
5. [Autenticazione e Autorizzazione](#5-autenticazione-e-autorizzazione)
6. [Portale Amministratore](#6-portale-amministratore)
7. [Portale Consulente](#7-portale-consulente)
8. [Portale Azienda](#8-portale-azienda)
9. [Funzionalita Trasversali](#9-funzionalita-trasversali)
10. [Server Actions - API Reference](#10-server-actions---api-reference)
11. [Validazione con Zod (shared)](#11-validazione-con-zod-shared)
12. [Configurazione e Deployment](#12-configurazione-e-deployment)
13. [Account Demo](#13-account-demo)
14. [Stato Attuale e Roadmap](#14-stato-attuale-e-roadmap)

---

## 1. Panoramica del Progetto

FinAgevolata e una piattaforma SaaS che collega **consulenti di finanza agevolata** e **aziende italiane** per gestire il ciclo di vita completo delle pratiche di bandi pubblici: dalla scoperta del bando alla presentazione della domanda.

### Problema che risolve

- Il 70% delle domande viene respinto per documentazione incompleta
- I consulenti gestiscono decine di pratiche con Excel e email
- Le aziende non sanno quali documenti servono e li consegnano in ritardo
- Il Click Day richiede velocita estrema (fondi esauriti in 15-20 minuti)

### I tre portali

| Portale | Utente | Funzione principale |
|---------|--------|---------------------|
| **Admin** | Operatore piattaforma | Gestione bandi, utenti, tipi documento |
| **Consulente** | Studio/freelance | Gestisce N clienti, verifica documenti, crea pratiche |
| **Azienda** | Impresa/PMI | Carica documenti, vede stato pratiche, comunica col consulente |

---

## 2. Architettura e Stack Tecnologico

### Stack

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| Framework | Next.js (App Router, Turbopack) | 15.5.x |
| UI | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| ORM | Prisma | 6.x |
| Database | PostgreSQL (Supabase) | - |
| Storage | Supabase Storage | - |
| Auth | NextAuth.js (Auth.js v5) | 5.x |
| Validazione | Zod | 3.x |
| Monorepo | Turborepo + pnpm workspaces | 2.9.x |
| Linguaggio | TypeScript | 5.7.x |

### Pattern architetturali

- **React Server Components (RSC)** per data fetching nelle pagine
- **Server Actions** (`"use server"`) per tutte le mutazioni
- **JWT Strategy** per sessioni (no database sessions)
- **Middleware** per protezione rotte basata su ruolo
- **Transazioni Prisma** (`$transaction`) per operazioni atomiche (es. upload + log attivita)
- **Validazione condivisa** tra frontend e backend tramite pacchetto `@finagevolata/shared`

### Flusso di una richiesta

```
Browser → Middleware (auth + role check) → RSC Page (data fetch) → Render HTML
Browser → Server Action → Validazione Zod → Prisma → DB → Response
```

---

## 3. Struttura del Monorepo

```
Proggetto_finanza_agevolata/
├── apps/
│   └── web/                          # Next.js 15 - unico frontend per i 3 portali
│       ├── app/
│       │   ├── page.tsx              # Root: routing intelligente per ruolo + onboarding
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   └── onboarding/page.tsx
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx        # DashboardShell con sidebar
│       │   │   ├── admin/
│       │   │   │   ├── page.tsx            # Dashboard admin
│       │   │   │   ├── bandi/page.tsx      # CRUD bandi + tipi documento
│       │   │   │   └── utenti/page.tsx     # Lista utenti
│       │   │   ├── consulente/
│       │   │   │   ├── page.tsx            # Dashboard consulente
│       │   │   │   ├── clienti/page.tsx    # Gestione clienti + inviti
│       │   │   │   ├── bandi/page.tsx      # Bandi disponibili
│       │   │   │   ├── pratiche/page.tsx   # Lista pratiche
│       │   │   │   ├── pratiche/[id]/page.tsx  # Dettaglio pratica
│       │   │   │   └── profilo/page.tsx    # Profilo consulente
│       │   │   └── azienda/
│       │   │       ├── page.tsx            # Dashboard azienda + banner inviti
│       │   │       ├── pratiche/page.tsx   # Lista pratiche
│       │   │       ├── pratiche/[id]/page.tsx  # Dettaglio pratica + upload
│       │   │       ├── bandi/page.tsx      # Bandi compatibili
│       │   │       ├── inviti/page.tsx     # Gestione consulenti/inviti
│       │   │       └── profilo/page.tsx    # Profilo aziendale
│       │   └── api/auth/[...nextauth]/route.ts
│       ├── components/
│       │   ├── dashboard-shell.tsx         # Layout sidebar con badge notifiche
│       │   ├── practice-chat.tsx           # Chat in tempo reale per pratica
│       │   ├── practice-timeline.tsx       # Timeline attivita pratica
│       │   ├── practice-status-badge.tsx   # Badge stato pratica colorato
│       │   ├── document-checklist.tsx      # Checklist documenti con stati
│       │   ├── document-upload.tsx         # Componente upload file
│       │   ├── grant-card.tsx              # Card bando
│       │   ├── notifications-dropdown.tsx  # Dropdown notifiche
│       │   └── ui/                         # Componenti base (shadcn/ui)
│       ├── lib/
│       │   ├── auth.ts                     # Configurazione NextAuth
│       │   ├── prisma.ts                   # Singleton Prisma Client
│       │   ├── supabase.ts                 # Client Supabase per storage
│       │   └── actions/                    # Server Actions
│       │       ├── auth.ts                 # registerUser
│       │       ├── companies.ts            # inviteCompany, respondToInvitation, completeOnboarding
│       │       ├── grants.ts               # createGrant, getGrants, getMatchingGrants, approveGrant
│       │       ├── grants-admin.ts         # createGrantWithDocuments
│       │       ├── practices.ts            # createPractice, getPractices, getPractice, updatePracticeStatus
│       │       ├── documents.ts            # uploadDocument, reviewDocument, getDocumentUrl
│       │       ├── chat.ts                 # sendMessage, getMessages
│       │       ├── timeline.ts             # getTimeline, logActivity
│       │       ├── notifications.ts        # CRUD notifiche
│       │       ├── profile.ts              # updateCompanyProfile, updateConsultantProfile
│       │       └── export.ts               # exportForClickDay
│       └── middleware.ts                   # Auth + role-based route protection
├── packages/
│   ├── db/                               # Prisma schema + seed
│   │   └── prisma/
│   │       ├── schema.prisma             # 15 modelli, 8 enum
│   │       ├── seed-demo.ts              # Dati demo realistici
│   │       └── seed.ts                   # Seed tipi documento standard
│   └── shared/                           # Logica condivisa
│       └── src/
│           ├── schemas/                  # Zod schemas (auth, company, grant, practice)
│           ├── constants/                # Tipi documento, regioni italiane
│           ├── services/matching.ts      # Algoritmo matching bando-azienda
│           └── types/                    # TypeScript types condivisi
├── .env                                  # Variabili d'ambiente (root)
├── turbo.json
└── package.json
```

---

## 4. Database Schema

### Modelli principali (15 modelli, 8 enum)

#### Utenti e Profili

| Modello | Tabella | Descrizione |
|---------|---------|-------------|
| `User` | `users` | Utente base con email, password (bcrypt), ruolo |
| `CompanyProfile` | `company_profiles` | Profilo aziendale: P.IVA, ATECO, regione, dimensione |
| `ConsultantProfile` | `consultant_profiles` | Profilo consulente: nome studio, specializzazioni, max clienti |
| `ConsultantCompany` | `consultant_companies` | Relazione N:N consulente-azienda con stato invito |

#### Bandi e Documenti

| Modello | Tabella | Descrizione |
|---------|---------|-------------|
| `Grant` | `grants` | Bando: titolo, ente, tipo, importi, scadenza, Click Day, ATECO eligibili |
| `DocumentType` | `document_types` | Tipo documento standard (Visura, DURC, DSAN, ecc.) con formati e scadenza |
| `GrantDocumentRequirement` | `grant_document_requirements` | Quali documenti richiede ogni bando |

#### Pratiche

| Modello | Tabella | Descrizione |
|---------|---------|-------------|
| `Practice` | `practices` | Pratica = bando + azienda + consulente |
| `PracticeDocument` | `practice_documents` | Documento della pratica con stato, file, versione, revisione |
| `PracticeMessage` | `practice_messages` | Messaggi chat tra consulente e azienda per pratica |
| `PracticeActivity` | `practice_activities` | Timeline attivita (creazione, upload, revisione, ecc.) |

#### Sistema

| Modello | Tabella | Descrizione |
|---------|---------|-------------|
| `Notification` | `notifications` | Notifiche in-app (scadenze, aggiornamenti, revisioni) |

### Enum principali

| Enum | Valori | Utilizzo |
|------|--------|----------|
| `UserRole` | ADMIN, CONSULTANT, COMPANY | Ruolo utente |
| `PracticeStatus` | DRAFT, DOCUMENTS_PENDING, DOCUMENTS_REVIEW, READY, SUBMITTED, WON, LOST | Stato pratica |
| `DocumentStatus` | MISSING, UPLOADED, IN_REVIEW, APPROVED, REJECTED | Stato documento |
| `GrantType` | FONDO_PERDUTO, FINANZIAMENTO_AGEVOLATO, CREDITO_IMPOSTA, GARANZIA | Tipo bando |
| `GrantStatus` | DRAFT, PUBLISHED, CLOSED, EXPIRED | Stato bando |
| `ClickDayStatus` | NONE, REQUESTED, SENT_TO_PARTNER, SUBMITTED, RANKED, WON, LOST | Stato Click Day |
| `InvitationStatus` | PENDING, ACTIVE, REVOKED | Stato invito consulente-azienda |
| `ActivityType` | PRACTICE_CREATED, STATUS_CHANGED, DOCUMENT_UPLOADED, DOCUMENT_APPROVED, DOCUMENT_REJECTED, MESSAGE_SENT, CLICKDAY_EXPORT | Tipo attivita timeline |

### Diagramma relazioni chiave

```
User (CONSULTANT) ──1:N──> ConsultantCompany ──N:1──> User (COMPANY)
     │                                                      │
     └──1:N──> Practice <──N:1──────────────────────────────┘
                  │
                  ├──N:1──> Grant ──1:N──> GrantDocumentRequirement ──N:1──> DocumentType
                  │
                  ├──1:N──> PracticeDocument ──N:1──> DocumentType
                  │
                  ├──1:N──> PracticeMessage
                  │
                  └──1:N──> PracticeActivity
```

---

## 5. Autenticazione e Autorizzazione

### Configurazione Auth

- **Provider:** Credentials (email + password)
- **Password hashing:** bcrypt con 12 rounds
- **Sessione:** JWT strategy (no database sessions)
- **Token:** contiene `id`, `email`, `name`, `role`
- **Pagine custom:** `/login` per sign-in

### Flusso di registrazione

1. Utente compila form su `/register` (email, nome, password, ruolo: CONSULTANT o COMPANY)
2. Validazione con `registerSchema` (Zod) - password min 8 caratteri
3. Hash password con bcrypt
4. Creazione record `User` nel DB
5. Redirect a `/login`

### Flusso di login

1. Utente inserisce email + password su `/login`
2. NextAuth verifica credenziali tramite Prisma
3. JWT generato con ruolo e ID utente
4. Redirect basato su ruolo:
   - ADMIN → `/admin`
   - CONSULTANT → `/consulente`
   - COMPANY → `/` (che verifica onboarding)

### Middleware - Protezione rotte

File: `apps/web/middleware.ts`

| Regola | Comportamento |
|--------|--------------|
| Auth page + logged in | Redirect alla dashboard del ruolo |
| `/onboarding` + COMPANY + logged in | Permesso |
| `/onboarding` + non-COMPANY | Redirect a `/login` |
| Dashboard + non logged in | Redirect a `/login` |
| `/consulente/*` + non CONSULTANT | Redirect a `/login` |
| `/azienda/*` + non COMPANY | Redirect a `/login` |
| `/admin/*` + non ADMIN | Redirect a `/login` |

### Onboarding obbligatorio (COMPANY)

Quando un utente COMPANY fa login per la prima volta:

1. `/` (root page) controlla se esiste `CompanyProfile` per l'utente
2. Se non esiste → redirect a `/onboarding`
3. L'utente compila: P.IVA (11 cifre), ragione sociale, forma giuridica, codice ATECO, regione, provincia, dimensione
4. Validazione con `companyOnboardingSchema`
5. Controllo duplicato P.IVA
6. Creazione `CompanyProfile` → redirect a `/azienda`

---

## 6. Portale Amministratore

### Dashboard (`/admin`)

Statistiche rapide: totale utenti, consulenti, aziende, bandi pubblicati.

### Gestione Bandi (`/admin/bandi`)

**Creazione bando con documenti:**
- Titolo, descrizione, ente emittente
- Tipo: Fondo Perduto, Finanziamento Agevolato, Credito d'Imposta, Garanzia
- Importo massimo, scadenza
- Click Day (si/no + data)
- Codici ATECO eligibili (separati da virgola, supporta prefissi)
- URL fonte ufficiale
- **Checklist documenti richiesti** (checkbox sui 15 tipi standard)

I bandi creati dall'admin sono automaticamente `PUBLISHED` e `approvedByAdmin: true`.
I bandi creati dai consulenti partono come `DRAFT` e devono essere approvati.

### Gestione Utenti (`/admin/utenti`)

Lista di tutti gli utenti con ruolo, email, data di registrazione.

---

## 7. Portale Consulente

### Dashboard (`/consulente`)

Statistiche: pratiche totali, pratiche attive, documenti da revisionare.

### Gestione Clienti (`/consulente/clienti`)

**Invito aziende:**
- Il consulente inserisce l'email dell'azienda
- Se l'azienda e registrata → crea record `ConsultantCompany` con stato `PENDING`
- L'azienda vede l'invito nella sua dashboard e puo accettare/rifiutare
- Se accettato → stato `ACTIVE`, il consulente puo creare pratiche per l'azienda

**Lista clienti:** tabella con nome azienda, P.IVA, regione, stato invito.

> **Nota:** Le email di notifica invito non sono ancora attive (Resend API key non configurata). L'azienda viene notificata tramite banner in-app sulla dashboard + badge nella sidebar.

### Bandi (`/consulente/bandi`)

Lista bandi disponibili (pubblicati + propri bozze). Il consulente puo anche proporre nuovi bandi (partono come DRAFT, necessitano approvazione admin).

### Pratiche (`/consulente/pratiche`)

**Creazione pratica:**
1. Seleziona bando (da quelli pubblicati)
2. Seleziona azienda cliente (solo con relazione ACTIVE)
3. Il sistema genera automaticamente la checklist documenti basata sul bando
4. Stato iniziale: `DOCUMENTS_PENDING`
5. Viene loggata l'attivita `PRACTICE_CREATED` nella timeline

**Lista pratiche:** tabella con bando, azienda, stato, conteggio documenti, data creazione.

### Dettaglio Pratica (`/consulente/pratiche/[id]`)

Layout a sezioni:

1. **Header:** titolo bando + badge stato + link ritorno
2. **Info Bando:** ente, scadenza, importo max, link fonte ufficiale
3. **Info Azienda:** nome, P.IVA, regione
4. **Documenti da revisionare:** per ogni documento con stato `UPLOADED`:
   - Nome documento, file, versione, data upload
   - Bottone "Approva" (→ `APPROVED`)
   - Bottone "Rifiuta" + campo motivo (→ `REJECTED`)
5. **Checklist Documenti completa:** tutti i documenti con stato colorato
6. **Chat con l'azienda:** messaggi in tempo reale (vedi sezione 9)
7. **Timeline Attivita:** log cronologico di tutte le azioni (vedi sezione 9)
8. **Aggiorna Stato Pratica:** dropdown per cambiare stato (DOCUMENTS_PENDING → DOCUMENTS_REVIEW → READY → SUBMITTED → WON/LOST)

### Profilo (`/consulente/profilo`)

Modifica: nome studio, specializzazioni (separate da virgola), numero massimo clienti.

---

## 8. Portale Azienda

### Dashboard (`/azienda`)

- **Banner inviti in attesa:** se ci sono inviti PENDING, appare un banner blu con i nomi dei consulenti e bottone "Rispondi agli inviti"
- **Statistiche:** pratiche attive, documenti mancanti, documenti rifiutati

### Pratiche (`/azienda/pratiche`)

Lista delle pratiche create dai propri consulenti, con stato e conteggio documenti.

### Dettaglio Pratica (`/azienda/pratiche/[id]`)

Layout a sezioni:

1. **Header:** titolo bando + badge stato
2. **Info Bando:** ente, scadenza, importo max, link fonte ufficiale
3. **Info Consulente:** nome studio, email
4. **Checklist Documenti:** tutti i documenti con stato
5. **Documenti da caricare:** se ci sono documenti MISSING o REJECTED:
   - Sezione evidenziata in giallo/ambra
   - Per ogni documento: campo file upload
   - Validazione formato e dimensione max
   - Al caricamento: upload su Supabase Storage → aggiornamento stato a `UPLOADED`
6. **Chat con il consulente:** messaggi bidirezionali
7. **Timeline Attivita:** log cronologico

### Bandi Compatibili (`/azienda/bandi`)

Lista dei bandi pubblicati **filtrati per compatibilita** con il profilo aziendale:
- Matching per codice ATECO (prefisso)
- Matching per regione
- Matching per dimensione azienda

### I miei Consulenti (`/azienda/inviti`)

- **Inviti in attesa:** con bottoni Accetta/Rifiuta
- **Consulenti attivi:** tabella con nome, email, data collegamento
- **Badge nella sidebar** con conteggio inviti pendenti

### Profilo Aziendale (`/azienda/profilo`)

Modifica tutti i dati aziendali: P.IVA, ragione sociale, forma giuridica, ATECO, regione, provincia, dimensione. Validazione duplicato P.IVA.

---

## 9. Funzionalita Trasversali

### Chat per Pratica

**File:** `apps/web/components/practice-chat.tsx` (client component)  
**Server Actions:** `apps/web/lib/actions/chat.ts`

- Messaggi bidirezionali tra consulente e azienda all'interno di ogni pratica
- Bolle di chat: blu per messaggi propri, grigio per messaggi ricevuti
- Label ruolo: "Consulente" o "Azienda"
- Timestamp in formato italiano (giorno/mese, ora:minuti)
- Ogni messaggio inviato logga automaticamente un'attivita `MESSAGE_SENT` nella timeline
- Autorizzazione: solo il consulente e l'azienda della pratica possono leggere/scrivere
- `useTransition` + `router.refresh()` per aggiornamento optimistic

### Timeline Attivita

**File:** `apps/web/components/practice-timeline.tsx` (server component)  
**Server Actions:** `apps/web/lib/actions/timeline.ts`

Registra automaticamente ogni azione sulla pratica:

| Evento | Icona | Colore | Esempio |
|--------|-------|--------|---------|
| `PRACTICE_CREATED` | + | Blu | "Pratica creata per il bando X" |
| `STATUS_CHANGED` | ~ | Viola | "Stato cambiato da 'In revisione' a 'Pronta per invio'" |
| `DOCUMENT_UPLOADED` | ^ | Celeste | "Ha caricato 'Visura Camerale'" |
| `DOCUMENT_APPROVED` | v | Verde | "Ha approvato 'DURC'" |
| `DOCUMENT_REJECTED` | x | Rosso | "Ha rifiutato 'Bilanci': formato non conforme" |
| `MESSAGE_SENT` | m | Grigio | "Ha inviato un messaggio" |
| `CLICKDAY_EXPORT` | ! | Ambra | Export per Click Day |

Ultimi 50 eventi, ordine cronologico inverso. Mostra attore + ruolo + timestamp.

### Sistema di Notifiche

**File:** `apps/web/lib/actions/notifications.ts`  
**UI:** `apps/web/components/notifications-dropdown.tsx`

- Notifiche in-app con dropdown nella sidebar
- Tipi: DOCUMENT_EXPIRING, DOCUMENT_REQUESTED, GRANT_DEADLINE, PRACTICE_UPDATE, DOCUMENT_REVIEWED
- Marca come letto singolarmente o tutte
- Ultime 20 notifiche

### Matching Bando-Azienda

**File:** `packages/shared/src/services/matching.ts`

Algoritmo di compatibilita che verifica:
1. Bando in stato `PUBLISHED`
2. Scadenza non superata
3. **ATECO:** match per prefisso (es. bando con `41` matcha azienda con `41.20`)
4. **Regione:** se specificata, deve coincidere
5. **Dimensione:** se specificata, deve coincidere (MICRO/SMALL/MEDIUM/LARGE)

Se un criterio non e specificato nel bando, non filtra (es. bando senza regioni = aperto a tutti).

### Gestione Documenti

**Upload** (`apps/web/lib/actions/documents.ts`):
1. Validazione ruolo COMPANY
2. Verifica che il documento appartenga alla pratica dell'utente
3. Validazione formato file vs `acceptedFormats` del `DocumentType`
4. Validazione dimensione vs `maxSizeMb`
5. Upload su Supabase Storage in `documents/practices/{practiceId}/{slug}/{timestamp}-{filename}`
6. Calcolo scadenza automatica se `validityDays` definito
7. Aggiornamento atomico: stato → `UPLOADED` + versione incrementata + log attivita

**Revisione** (`reviewDocument`):
1. Validazione ruolo CONSULTANT
2. Verifica che il documento sia della propria pratica
3. Verifica stato `UPLOADED`
4. Approva → `APPROVED` oppure Rifiuta → `REJECTED` + motivo
5. Log attivita automatico

**URL firmato** (`getDocumentUrl`):
- Genera URL firmato Supabase con scadenza 5 minuti (300 secondi)
- Accessibile solo dal consulente o dall'azienda della pratica

### Export Click Day

**File:** `apps/web/lib/actions/export.ts`

Genera un pacchetto JSON con tutti i dati necessari per il partner Click Day:
- Dati pratica, bando (con data Click Day), azienda (P.IVA, ATECO, regione)
- Lista documenti con path
- **Prerequisito:** tutti i documenti devono essere `APPROVED`
- Aggiorna `clickDayStatus` a `REQUESTED`

---

## 10. Server Actions - API Reference

### Auth (`lib/actions/auth.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `registerUser(formData)` | email, name, password, role | `{success}` o `{error}` | Pubblico |

### Companies (`lib/actions/companies.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `completeOnboarding(formData)` | vatNumber, companyName, legalForm, atecoCode, atecoDescription, province, region, employeeCount | `{success}` o `{error}` | COMPANY |
| `inviteCompany(formData)` | companyEmail | `{success}` o `{error}` | CONSULTANT |
| `respondToInvitation(id, accept)` | invitationId, boolean | `{success}` o `{error}` | COMPANY |
| `getMyClients()` | - | ConsultantCompany[] | CONSULTANT |

### Grants (`lib/actions/grants.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `createGrant(formData)` | title, description, issuingBody, grantType, ... | `{success}` o `{error}` | ADMIN, CONSULTANT |
| `getGrants()` | - | Grant[] | Tutti (filtrato per ruolo) |
| `getMatchingGrants(companyId)` | userId | Grant[] | Tutti |
| `approveGrant(grantId)` | grantId | `{success}` o `{error}` | ADMIN |

### Grants Admin (`lib/actions/grants-admin.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `createGrantWithDocuments(formData)` | title, description, ..., documentTypeIds[] | `{success}` o `{error}` | ADMIN |

### Practices (`lib/actions/practices.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `createPractice(formData)` | grantId, companyId | `{success, practiceId}` o `{error}` | CONSULTANT |
| `getPractices()` | - | Practice[] | Tutti (filtrato per ruolo) |
| `getPractice(id)` | practiceId | Practice o null | Tutti (filtrato per ruolo) |
| `updatePracticeStatus(id, status)` | practiceId, status | `{success}` o `{error}` | CONSULTANT |

### Documents (`lib/actions/documents.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `uploadDocument(docId, formData)` | practiceDocId, file | `{success}` o `{error}` | COMPANY |
| `reviewDocument(docId, formData)` | practiceDocId, status, rejectionReason | `{success}` o `{error}` | CONSULTANT |
| `getDocumentUrl(docId)` | practiceDocId | `{url}` o `{error}` | COMPANY, CONSULTANT |

### Chat (`lib/actions/chat.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `sendMessage(practiceId, content)` | practiceId, testo | `{success}` o `{error}` | COMPANY, CONSULTANT |
| `getMessages(practiceId)` | practiceId | PracticeMessage[] | COMPANY, CONSULTANT |

### Timeline (`lib/actions/timeline.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `getTimeline(practiceId)` | practiceId | PracticeActivity[] | COMPANY, CONSULTANT |
| `logActivity(practiceId, actorId, type, detail)` | - | void | Interno |

### Profile (`lib/actions/profile.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `updateCompanyProfile(formData)` | tutti i campi profilo | `{success}` o `{error}` | COMPANY |
| `updateConsultantProfile(formData)` | firmName, specializations, maxClients | `{success}` o `{error}` | CONSULTANT |

### Notifications (`lib/actions/notifications.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `createNotification(data)` | userId, type, title, message, practiceId? | void | Interno |
| `getNotifications()` | - | Notification[] | Tutti |
| `getUnreadCount()` | - | number | Tutti |
| `markAsRead(id)` | notificationId | `{success}` o `{error}` | Tutti |
| `markAllAsRead()` | - | `{success}` o `{error}` | Tutti |

### Export (`lib/actions/export.ts`)

| Action | Input | Output | Ruolo |
|--------|-------|--------|-------|
| `exportForClickDay(practiceId)` | practiceId | `{success, data}` o `{error}` | CONSULTANT |

---

## 11. Validazione con Zod (shared)

Tutti gli schemi di validazione sono nel pacchetto `@finagevolata/shared` e vengono usati sia lato server (Server Actions) che potenzialmente lato client.

### `registerSchema`
- email: email valida
- name: min 2 caratteri
- password: min 8 caratteri
- role: "CONSULTANT" o "COMPANY"

### `loginSchema`
- email: email valida
- password: min 1 carattere

### `companyOnboardingSchema`
- vatNumber: esattamente 11 cifre (`/^\d{11}$/`)
- companyName: min 2 caratteri
- legalForm: min 2 caratteri
- atecoCode: min 2 caratteri
- atecoDescription: min 2 caratteri
- province: min 2 caratteri
- region: min 2 caratteri
- employeeCount: MICRO | SMALL | MEDIUM | LARGE

### `grantCreateSchema`
- title: min 3 caratteri
- description: min 10 caratteri
- issuingBody: min 2 caratteri
- grantType: FONDO_PERDUTO | FINANZIAMENTO_AGEVOLATO | CREDITO_IMPOSTA | GARANZIA
- importi, date, Click Day, ATECO, regioni, dimensioni (tutti opzionali)
- documentRequirements: array opzionale

### `companyInviteSchema`
- companyEmail: email valida

---

## 12. Configurazione e Deployment

### Variabili d'ambiente (`.env`)

```env
# Database (Supabase PostgreSQL - Session Pooler)
DATABASE_URL="postgresql://postgres.XXX:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.XXX:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://XXX.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<random-base64>"
AUTH_SECRET="<same-as-NEXTAUTH_SECRET>"

# Email (non ancora attivo)
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="noreply@finagevolata.it"
```

**Importante:** Il file `.env` e nella root del monorepo. Symlink creati in:
- `packages/db/.env` → `../../.env` (per Prisma)
- `apps/web/.env` → `../../.env` (per Next.js)

### Comandi principali

```bash
# Installazione dipendenze
pnpm install

# Avvio sviluppo (tutti i pacchetti)
pnpm dev

# Database
cd packages/db
npx prisma db push          # Push schema al DB (senza migration)
npx prisma generate          # Genera Prisma Client
npx prisma studio            # GUI database
npx tsx prisma/seed.ts       # Seed tipi documento standard
npx tsx prisma/seed-demo.ts  # Seed dati demo completi

# Build produzione
pnpm build
```

### Prerequisiti Supabase

1. Creare un bucket `documents` in Supabase Dashboard > Storage
2. Configurare le policy RLS per il bucket (accesso autenticato)
3. Usare il Session Pooler per la connessione DB (IPv4 compatibile)

---

## 13. Account Demo

Il seed demo (`packages/db/prisma/seed-demo.ts`) crea i seguenti account:

### Admin
| Campo | Valore |
|-------|--------|
| Email | admin@finagevolata.it |
| Password | admin123456 |

### Consulente
| Campo | Valore |
|-------|--------|
| Email | marco.bianchi@studio-bianchi.it |
| Password | consulente123 |
| Studio | Studio Bianchi & Associati |
| Specializzazioni | Industria 4.0, PNRR, Crediti R&D |

### Aziende

| Azienda | Email | Password | P.IVA | ATECO | Regione |
|---------|-------|----------|-------|-------|---------|
| Rossi Costruzioni Srl | info@rossi-costruzioni.it | azienda123 | 01234567890 | 41.20 | Lombardia |
| TechSolutions SpA | admin@techsolutions.it | azienda123 | 09876543210 | 62.01 | Lazio |
| Meccanica Ferrari Srl | info@meccanica-ferrari.it | azienda123 | 05432167890 | 25.62 | Veneto |

### Bandi Demo

| Bando | Ente | Tipo | Click Day | ATECO |
|-------|------|------|-----------|-------|
| Bando Macchinari Innovativi 2026 | MISE | Fondo Perduto | Si | 25, 28, 41 |
| Voucher Digitalizzazione PMI | MISE | Fondo Perduto | No | (tutti) |
| Bando ISI INAIL 2026 | INAIL | Fondo Perduto | Si | (tutti) |
| Credito d'Imposta R&D Lazio | Regione Lazio | Credito Imposta | No | 62, 63, 72 |
| Transizione Ecologica (bozza) | MASE | Fondo Perduto | No | 25, 28, 41 |

### Pratiche Demo

| Pratica | Azienda | Bando | Stato |
|---------|---------|-------|-------|
| demo-practice-1 | Rossi Costruzioni | Macchinari Innovativi | DOCUMENTS_REVIEW |
| demo-practice-2 | TechSolutions | Voucher Digitalizzazione | DOCUMENTS_PENDING |
| demo-practice-3 | Rossi Costruzioni | ISI INAIL | READY |

---

## 14. Stato Attuale e Roadmap

### Funzionalita completate (MVP)

- [x] Registrazione e login con ruoli (Admin, Consulente, Azienda)
- [x] Onboarding obbligatorio per aziende (P.IVA, ATECO, regione)
- [x] Modifica profilo per aziende e consulenti
- [x] Gestione bandi con tipi documento (Admin)
- [x] Creazione bandi da consulente (con approvazione admin)
- [x] Matching automatico bando-azienda (ATECO prefix, regione, dimensione)
- [x] Invito aziende da parte del consulente
- [x] Accettazione/rifiuto inviti lato azienda
- [x] Banner + badge per inviti in attesa sulla dashboard azienda
- [x] Creazione pratiche (consulente seleziona bando + azienda)
- [x] Checklist documenti automatica basata sul bando
- [x] Upload documenti da azienda (con validazione formato e dimensione)
- [x] Revisione documenti da consulente (approva/rifiuta con motivo)
- [x] Aggiornamento stato pratica (consulente)
- [x] Chat per pratica (consulente <-> azienda)
- [x] Timeline attivita automatica su ogni pratica
- [x] Sistema notifiche in-app
- [x] Export dati per Click Day (JSON)
- [x] Protezione rotte basata su ruolo (middleware)
- [x] Dati demo realistici per demo/vendita

### Da completare / Roadmap

- [ ] **Email transazionali** — Configurare Resend API key per invio email (inviti, scadenze, notifiche)
- [ ] **Bucket Supabase** — Creare bucket `documents` su Supabase Dashboard > Storage con policy RLS
- [ ] **Download documenti** — UI per consultare/scaricare documenti caricati (l'action `getDocumentUrl` esiste gia)
- [ ] **Notifiche automatiche** — Trigger notifiche su: documento caricato, documento revisionato, scadenza imminente
- [ ] **Ricerca/filtri bandi** — Barra di ricerca e filtri avanzati nella lista bandi
- [ ] **Paginazione** — Aggiungere paginazione su liste pratiche, bandi, utenti
- [ ] **Integrazione Click Day live** — API endpoint per partner esterni (MouseX)
- [ ] **SPID/CIE** — Login con identita digitale
- [ ] **AI Document Checker** — Analisi automatica qualita documenti
- [ ] **Mobile app** — Notifiche push e upload foto documenti
- [ ] **White-label** — Piattaforma brandizzabile per studi di consulenza
