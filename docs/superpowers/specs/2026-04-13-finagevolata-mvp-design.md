# FinAgevolata SaaS — MVP Design Spec

## Overview

SaaS platform bridging **subsidized finance consultants** and **Italian companies** seeking public grants (MISE, Invitalia, INAIL, Regions, PNRR). The MVP covers authentication, document management with dynamic checklists, a grant database with company matching, and a shared consultant-company workspace.

## Problem Statement

- 70% of grant applications are rejected due to incomplete or non-compliant documentation
- Consultants manage dozens of cases manually with Excel and email
- Companies don't know which documents are needed, deliver them late or incorrect
- No competitor offers a bidirectional portal where both consultant and company have active visibility on document status

## MVP Scope

**In scope:**
1. Authentication (email/password, role-based: Admin, Consultant, Company)
2. Company onboarding (VAT number → auto-populate profile)
3. Document upload with dynamic per-grant checklist
4. Document status workflow (missing → uploaded → in review → approved → rejected with reason)
5. Grant database (manual entry by admin + consultant-contributed)
6. Grant ↔ company matching (sector, size, location, requirements)
7. Shared consultant-company workspace per practice (grant + company + documents)
8. Basic email notifications (document/grant deadlines)
9. Data export for MouseX Click Day partner
10. Admin dashboard

**Out of scope (Phase 2):**
- Automatic grant feed (RSS/scraping)
- MouseX bidirectional API
- Real-time chat/messaging
- OCR / AI document checker
- MFA
- Advanced analytics
- Consultant marketplace
- SPID/CIE integration
- Mobile app
- White-label

## Architecture

### Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend + API | Next.js 15 (App Router + API Routes + Server Actions) | Single deploy, type-safe end-to-end, fast MVP |
| UI | Tailwind CSS + shadcn/ui | Consistent design system, rapid development |
| Auth | NextAuth.js v5 (Auth.js) | Zero cost, self-hosted, full control, SPID/CIE ready |
| Database | Supabase PostgreSQL + Prisma ORM | Managed PostgreSQL, type-safe queries, migrations |
| Document Storage | Supabase Storage | S3-compatible, RLS on files, EU servers (Frankfurt), 1GB free |
| Validation | Zod | Shared schemas frontend/backend |
| Deploy | Vercel (app) + Supabase (DB + Storage) | Zero DevOps, auto-deploy from GitHub, generous free tiers |
| Monorepo | Turborepo + pnpm workspaces | Shared packages, parallel builds |

### Hybrid Backend Strategy

MVP uses Next.js API Routes and Server Actions as the sole backend. Business logic lives in `packages/shared` (framework-agnostic services and types). When WebSocket, heavy background jobs, or Click Day API integration require it, the backend extracts to a standalone NestJS service — the shared package makes this migration natural without rewriting logic.

### Project Structure

```
Proggetto_finanza_agevolata/
├── apps/
│   └── web/                          # Next.js 15 app (all portals)
│       ├── app/
│       │   ├── (auth)/               # Login, register, onboarding
│       │   │   ├── login/
│       │   │   ├── register/
│       │   │   └── onboarding/       # Company VAT onboarding flow
│       │   ├── (dashboard)/          # Authenticated area
│       │   │   ├── consulente/       # Consultant portal
│       │   │   │   ├── clienti/      # Client list + management
│       │   │   │   ├── pratiche/     # Practices overview
│       │   │   │   └── bandi/        # Grant search + matching
│       │   │   ├── azienda/          # Company portal
│       │   │   │   ├── documenti/    # Document upload + status
│       │   │   │   ├── pratiche/     # My practices
│       │   │   │   └── bandi/        # Matched grants
│       │   │   └── admin/            # Admin panel
│       │   │       ├── bandi/        # Grant CRUD
│       │   │       ├── utenti/       # User management
│       │   │       └── overview/     # Platform metrics
│       │   ├── api/                  # API Routes
│       │   │   ├── auth/             # NextAuth handlers
│       │   │   ├── documents/        # Upload, status, validation
│       │   │   ├── grants/           # Grant CRUD, matching
│       │   │   ├── practices/        # Practice management
│       │   │   └── export/           # MouseX data export
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                   # shadcn/ui components
│       │   ├── documents/            # Document-specific components
│       │   ├── grants/               # Grant-specific components
│       │   └── practices/            # Practice-specific components
│       ├── lib/
│       │   ├── auth.ts               # NextAuth config
│       │   ├── supabase.ts           # Supabase client
│       │   └── utils.ts
│       └── ...
├── packages/
│   ├── shared/                       # Framework-agnostic business logic
│   │   ├── src/
│   │   │   ├── types/                # TypeScript types (User, Grant, Document, Practice)
│   │   │   ├── schemas/              # Zod validation schemas
│   │   │   ├── services/             # Business logic (matching, document validation)
│   │   │   └── constants/            # ATECO codes, document types, grant statuses
│   │   └── package.json
│   └── db/                           # Database layer
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts               # Initial grants, document types
│       └── package.json
├── docker/
│   └── docker-compose.yml            # Local dev (PostgreSQL, optional MinIO)
├── docs/
│   └── superpowers/specs/            # Design specs
├── .github/
│   └── workflows/                    # CI/CD
├── turbo.json
├── package.json
├── .env.example
└── CLAUDE.md
```

## Data Model

### Core Entities

```
User
├── id: UUID (PK)
├── email: string (unique)
├── name: string
├── role: enum (ADMIN, CONSULTANT, COMPANY)
├── emailVerified: datetime
├── createdAt, updatedAt: datetime
│
├── # Company-specific fields (role=COMPANY)
├── companyProfile?: CompanyProfile
│
└── # Consultant-specific fields (role=CONSULTANT)
    └── consultantProfile?: ConsultantProfile

CompanyProfile
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── vatNumber: string (unique)         # Partita IVA
├── companyName: string
├── legalForm: string                  # SRL, SPA, SNC, etc.
├── atecoCode: string                  # Primary ATECO code
├── atecoDescription: string
├── province: string
├── region: string
├── employeeCount: enum (MICRO, SMALL, MEDIUM, LARGE)
├── annualRevenue: decimal?
├── foundedAt: date?
└── createdAt, updatedAt: datetime

ConsultantProfile
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── firmName: string?
├── specializations: string[]          # Areas of expertise
├── maxClients: int                    # Plan limit
└── createdAt, updatedAt: datetime

Grant (Bando)
├── id: UUID (PK)
├── title: string
├── description: text
├── issuingBody: string                # MISE, Invitalia, Regione X, INAIL
├── grantType: enum (FONDO_PERDUTO, FINANZIAMENTO_AGEVOLATO, CREDITO_IMPOSTA, GARANZIA)
├── minAmount: decimal?
├── maxAmount: decimal?
├── deadline: datetime?
├── openDate: datetime?
├── hasClickDay: boolean
├── clickDayDate: datetime?
├── status: enum (DRAFT, PUBLISHED, CLOSED, EXPIRED)
├── eligibleAtecoCodes: string[]       # Eligible ATECO sectors
├── eligibleRegions: string[]          # Empty = all regions
├── eligibleCompanySizes: enum[]       # MICRO, SMALL, MEDIUM, LARGE
├── requiredDocumentTypes: GrantDocumentRequirement[]
├── sourceUrl: string?                 # Official grant page
├── createdById: UUID (FK → User)      # Admin or consultant who created it
├── approvedByAdmin: boolean           # If created by consultant, needs approval
└── createdAt, updatedAt: datetime

GrantDocumentRequirement
├── id: UUID (PK)
├── grantId: UUID (FK → Grant)
├── documentTypeId: UUID (FK → DocumentType)
├── isRequired: boolean                # Required vs optional
├── notes: string?                     # Grant-specific instructions
└── order: int

DocumentType
├── id: UUID (PK)
├── name: string                       # "Visura Camerale", "DURC", etc.
├── slug: string (unique)
├── description: text
├── validityDays: int?                 # e.g., DURC = 120, Visura = 180
├── acceptedFormats: string[]          # ["pdf", "p7m", "jpg"]
├── maxSizeMb: int
├── category: enum (LEGAL, FINANCIAL, FISCAL, PROJECT, CERTIFICATION)
└── isStandard: boolean                # Part of the common set (15 standard docs)

Practice (Pratica)
├── id: UUID (PK)
├── grantId: UUID (FK → Grant)
├── companyId: UUID (FK → User, role=COMPANY)
├── consultantId: UUID (FK → User, role=CONSULTANT)
├── status: enum (DRAFT, DOCUMENTS_PENDING, DOCUMENTS_REVIEW, READY, SUBMITTED, WON, LOST)
├── clickDayStatus: enum? (NONE, REQUESTED, SENT_TO_PARTNER, SUBMITTED, RANKED, WON, LOST)
├── notes: text?
└── createdAt, updatedAt: datetime

PracticeDocument
├── id: UUID (PK)
├── practiceId: UUID (FK → Practice)
├── documentTypeId: UUID (FK → DocumentType)
├── status: enum (MISSING, UPLOADED, IN_REVIEW, APPROVED, REJECTED)
├── rejectionReason: string?
├── filePath: string?                  # Supabase Storage path
├── fileName: string?
├── fileSize: int?
├── uploadedAt: datetime?
├── reviewedAt: datetime?
├── reviewedById: UUID? (FK → User)
├── expiresAt: datetime?               # Calculated from DocumentType.validityDays
├── version: int                       # Increments on re-upload
└── createdAt, updatedAt: datetime

ConsultantCompany (relationship)
├── consultantId: UUID (FK → User)
├── companyId: UUID (FK → User)
├── status: enum (PENDING, ACTIVE, REVOKED)
├── invitedAt: datetime
└── acceptedAt: datetime?

Notification
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── type: enum (DOCUMENT_EXPIRING, DOCUMENT_REQUESTED, GRANT_DEADLINE, PRACTICE_UPDATE, DOCUMENT_REVIEWED)
├── title: string
├── message: text
├── practiceId: UUID? (FK → Practice)
├── isRead: boolean
├── sentViaEmail: boolean
└── createdAt: datetime
```

### Key Relationships

- A **Consultant** has many **Companies** (via ConsultantCompany)
- A **Practice** = one Grant + one Company + one Consultant
- A Practice has many **PracticeDocuments**, one per required DocumentType
- When a Practice is created, PracticeDocuments are auto-generated from the Grant's GrantDocumentRequirements, all with status MISSING
- **DocumentType** is a system table seeded with the 15 standard document types

## Core Flows

### 1. Company Onboarding

```
Company registers → enters VAT number (P.IVA)
  → System calls external API to fetch company data (CCIAA)
  → Auto-populates: company name, ATECO code, legal form, province, region
  → Company confirms/edits → profile saved
  → Company is visible to consultants for invitation
```

For MVP, the CCIAA API lookup is optional (nice-to-have). Fallback: manual entry with ATECO code dropdown.

### 2. Consultant Adds Client

```
Consultant searches by VAT or email
  → Sends invitation to company
  → Company accepts → ConsultantCompany.status = ACTIVE
  → Consultant can now create practices for this company
```

### 3. Practice Creation (core flow)

```
Consultant selects a grant + a company
  → System creates Practice
  → System reads Grant.requiredDocumentTypes
  → Auto-generates PracticeDocument rows (all status = MISSING)
  → Company sees checklist: "Upload these 8 documents for Bando ISI INAIL"
  → Consultant sees dashboard: 3 uploaded, 2 missing, 1 rejected, 2 approved
```

### 4. Document Upload & Review

```
Company uploads a document
  → PracticeDocument.status = UPLOADED
  → Consultant is notified
  → Consultant reviews:
    → APPROVED: document is valid
    → REJECTED: with reason ("Il bilancio è del 2023, serve il 2024")
  → If rejected, company is notified and can re-upload (version++)
  → Document expiry: if DocumentType has validityDays, system calculates expiresAt
    → Cron/scheduled check: if expiresAt < 30 days → notify
```

### 5. Grant Matching

```
Company has profile: ATECO=28.99, region=Lombardia, size=SMALL
  → System queries grants where:
    - eligibleAtecoCodes contains 28.99 (or is empty = all)
    - eligibleRegions contains Lombardia (or is empty = all)
    - eligibleCompanySizes contains SMALL
    - status = PUBLISHED
    - deadline > now
  → Returns ranked list of matching grants
  → Consultant can filter/sort and create practice from match
```

### 6. MouseX Click Day Export

```
Practice.status = READY (all documents approved)
  → Consultant clicks "Richiedi Click Day"
  → System generates export package:
    - Company data (name, VAT, ATECO, legal form, legal rep)
    - Grant data (name, issuing body, click day date)
    - Document list with status
    - ZIP of all approved documents
  → Sends via email to MouseX contact
  → Practice.clickDayStatus = SENT_TO_PARTNER
  → Consultant manually updates status as it progresses
```

## Document Types Seed Data

The system is seeded with 15 standard document types:

| Slug | Name | Validity (days) | Category | Formats |
|------|------|-----------------|----------|---------|
| visura-camerale | Visura Camerale | 180 | LEGAL | pdf |
| durc | DURC | 120 | LEGAL | pdf |
| dsan | Dichiarazione Sostitutiva Atto Notorio | null | LEGAL | pdf, p7m |
| bilanci | Bilanci Depositati | null | FINANCIAL | pdf |
| business-plan | Business Plan | null | PROJECT | pdf, docx |
| de-minimis | Dichiarazione de minimis | null | FISCAL | pdf, p7m |
| preventivi | Preventivi Fornitori | null | PROJECT | pdf |
| antimafia | Dichiarazione Antimafia | null | LEGAL | pdf |
| antiriciclaggio | Dichiarazione Antiriciclaggio | null | LEGAL | pdf |
| contabilita-separata | Impegno Contabilità Separata | null | FINANCIAL | pdf, p7m |
| documento-identita | Documento Identità Legale Rappresentante | null | LEGAL | pdf, jpg, png |
| firma-digitale | Certificato Firma Digitale | null | LEGAL | p7m, cer |
| ateco | Certificato Codice ATECO | null | LEGAL | pdf |
| dichiarazioni-fiscali | Dichiarazioni Fiscali | null | FISCAL | pdf |
| certificazioni | Certificazioni Specifiche (ISO, SOA, etc.) | null | CERTIFICATION | pdf |

## Notification Rules

| Trigger | Recipient | Channel | Timing |
|---------|-----------|---------|--------|
| Document expiring | Company + Consultant | Email + In-app | 30, 15, 7, 1 days before |
| Grant deadline approaching | Consultant | Email + In-app | 30, 15, 7, 1 days before |
| Document requested by consultant | Company | Email + In-app | Immediate |
| Document uploaded by company | Consultant | In-app | Immediate |
| Document reviewed (approved/rejected) | Company | Email + In-app | Immediate |
| New grant matching company profile | Consultant | Email (digest) | Daily |
| Practice status change | Company + Consultant | In-app | Immediate |

MVP implements email notifications via Vercel Cron (daily check) + transactional emails (Resend or similar) for immediate triggers via Server Actions.

## Auth & Authorization

### Roles and Permissions

| Action | Admin | Consultant | Company |
|--------|-------|------------|---------|
| Create/edit grants | Yes | Yes (needs approval) | No |
| View all grants | Yes | Yes | Matched only |
| Create practice | No | Own clients only | No |
| Upload documents | No | No | Own practices only |
| Review documents | No | Own clients only | No |
| View practice | Yes (all) | Own clients | Own practices |
| Manage users | Yes | No | No |
| Export Click Day data | No | Own practices | No |

### Row-Level Security

- Consultants see only companies linked via ConsultantCompany (status=ACTIVE)
- Companies see only their own practices and documents
- Supabase Storage RLS: file access restricted to practice participants
- Admin sees everything

## API Design

All API routes under `/api/v1/`. Standard response format:

```typescript
// Success
{ data: T, meta?: { page, total, ... } }

// Error
{ error: { code: string, message: string, details?: any } }
```

### Key Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login

GET    /api/v1/grants                    # List/search grants (filtered by role)
POST   /api/v1/grants                    # Create grant (admin/consultant)
GET    /api/v1/grants/:id
GET    /api/v1/grants/match/:companyId   # Get matching grants for company

GET    /api/v1/practices                 # List practices (filtered by role)
POST   /api/v1/practices                 # Create practice (consultant)
GET    /api/v1/practices/:id
PATCH  /api/v1/practices/:id             # Update status

POST   /api/v1/practices/:id/documents/:docId/upload    # Upload document
PATCH  /api/v1/practices/:id/documents/:docId/review     # Approve/reject
GET    /api/v1/practices/:id/documents                   # List practice documents

POST   /api/v1/practices/:id/export-clickday             # Generate MouseX export

GET    /api/v1/companies                 # Consultant: list my clients
POST   /api/v1/companies/invite          # Send invitation
PATCH  /api/v1/companies/invite/:id      # Accept/decline

GET    /api/v1/notifications             # List notifications
PATCH  /api/v1/notifications/:id/read    # Mark as read

GET    /api/v1/admin/users               # Admin: user management
GET    /api/v1/admin/grants/pending      # Admin: grants pending approval
PATCH  /api/v1/admin/grants/:id/approve  # Admin: approve consultant grant
```

## Security

- Documents encrypted at rest (Supabase Storage default encryption)
- Document access via short-lived presigned URLs (5 min expiry)
- Row-level security enforced at both Prisma middleware and Supabase RLS level
- CSRF protection via Next.js built-in
- Rate limiting on auth endpoints (NextAuth built-in + custom middleware)
- Input validation with Zod on every endpoint
- Audit log on all document operations (upload, review, delete)
- GDPR: explicit consent at registration, data export/deletion endpoints
- HTTPS enforced (Vercel default)

## Development Conventions

- **Code language**: English (variables, functions, components)
- **UI language**: Italian (user interface)
- **Documentation**: English
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Branches**: `feat/name`, `fix/name`, `chore/name`
- **Validation**: Zod schemas in `packages/shared`, imported by both frontend and API
- **Env vars**: never committed, `.env.example` as template
