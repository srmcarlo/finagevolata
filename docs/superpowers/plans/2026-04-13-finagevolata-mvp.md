# FinAgevolata MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working MVP SaaS that lets consultants manage grant applications for their company clients, with dynamic document checklists, grant matching, and Click Day export.

**Architecture:** Next.js 15 monolite (App Router + API Routes + Server Actions) deployed on Vercel. Supabase for PostgreSQL + file storage. Prisma ORM. NextAuth.js v5 for authentication. Turborepo monorepo with shared packages.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, shadcn/ui, NextAuth.js v5, Prisma, Supabase (PostgreSQL + Storage), Zod, Turborepo, pnpm, Vitest, Resend (email)

---

## File Map

### Root

| File | Responsibility |
|------|---------------|
| `package.json` | Workspace root, pnpm workspaces config |
| `turbo.json` | Turborepo pipeline (build, dev, lint, test) |
| `.env.example` | Template for all env vars |
| `.gitignore` | Already exists |
| `CLAUDE.md` | Already exists |

### `packages/db/`

| File | Responsibility |
|------|---------------|
| `package.json` | Prisma dependencies |
| `prisma/schema.prisma` | Full data model (all entities) |
| `prisma/seed.ts` | Seed 15 document types + admin user |
| `src/index.ts` | Re-export Prisma client |

### `packages/shared/`

| File | Responsibility |
|------|---------------|
| `package.json` | Zod dependency |
| `src/types/index.ts` | TypeScript enums and type aliases |
| `src/schemas/auth.ts` | Zod schemas: register, login |
| `src/schemas/grant.ts` | Zod schemas: grant create/update, matching filters |
| `src/schemas/practice.ts` | Zod schemas: practice create, document review |
| `src/schemas/company.ts` | Zod schemas: company profile, onboarding |
| `src/schemas/index.ts` | Re-export all schemas |
| `src/constants/document-types.ts` | 15 standard document type definitions (used by seed + UI) |
| `src/constants/ateco.ts` | Top-level ATECO code list for dropdown |
| `src/constants/regions.ts` | Italian regions + provinces list |
| `src/constants/index.ts` | Re-export all constants |
| `src/services/matching.ts` | Grant ↔ company matching logic (pure function) |
| `src/index.ts` | Re-export everything |

### `apps/web/`

| File | Responsibility |
|------|---------------|
| `package.json` | Next.js + all app dependencies |
| `next.config.ts` | Next.js config with transpilePackages |
| `tailwind.config.ts` | Tailwind config |
| `tsconfig.json` | TS config referencing workspace packages |
| `lib/auth.ts` | NextAuth.js v5 configuration |
| `lib/prisma.ts` | Prisma client singleton |
| `lib/supabase.ts` | Supabase client (server + browser) |
| `lib/actions/auth.ts` | Server actions: register, login helpers |
| `lib/actions/practices.ts` | Server actions: create practice, update status |
| `lib/actions/documents.ts` | Server actions: upload, review document |
| `lib/actions/grants.ts` | Server actions: create/update grant, matching |
| `lib/actions/companies.ts` | Server actions: invite, accept, onboarding |
| `lib/actions/notifications.ts` | Server actions: create/read notifications |
| `lib/actions/export.ts` | Server action: generate MouseX export |
| `middleware.ts` | Auth middleware (protect dashboard routes) |
| `app/layout.tsx` | Root layout with providers |
| `app/page.tsx` | Landing page (redirect to login) |
| `app/(auth)/login/page.tsx` | Login form |
| `app/(auth)/register/page.tsx` | Register form (role selection) |
| `app/(auth)/onboarding/page.tsx` | Company onboarding (VAT + profile) |
| `app/(dashboard)/layout.tsx` | Dashboard shell (sidebar, header, role-based nav) |
| `app/(dashboard)/consulente/page.tsx` | Consultant home (overview) |
| `app/(dashboard)/consulente/clienti/page.tsx` | Client list + invite |
| `app/(dashboard)/consulente/pratiche/page.tsx` | Practices list |
| `app/(dashboard)/consulente/pratiche/[id]/page.tsx` | Practice detail (document checklist) |
| `app/(dashboard)/consulente/bandi/page.tsx` | Grant search + matching |
| `app/(dashboard)/azienda/page.tsx` | Company home (overview) |
| `app/(dashboard)/azienda/pratiche/page.tsx` | My practices |
| `app/(dashboard)/azienda/pratiche/[id]/page.tsx` | Practice detail (upload documents) |
| `app/(dashboard)/azienda/bandi/page.tsx` | Matched grants |
| `app/(dashboard)/admin/page.tsx` | Admin overview |
| `app/(dashboard)/admin/bandi/page.tsx` | Grant CRUD |
| `app/(dashboard)/admin/utenti/page.tsx` | User management |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth API handler |
| `components/ui/` | shadcn/ui components (button, input, card, table, dialog, badge, etc.) |
| `components/dashboard-shell.tsx` | Sidebar + header + content area |
| `components/document-checklist.tsx` | Document checklist with status badges |
| `components/document-upload.tsx` | Upload widget with drag & drop |
| `components/grant-card.tsx` | Grant summary card |
| `components/practice-status-badge.tsx` | Status badge component |
| `components/notifications-dropdown.tsx` | Bell icon + notifications list |

### Tests

| File | Responsibility |
|------|---------------|
| `packages/shared/src/services/matching.test.ts` | Matching logic unit tests |
| `packages/shared/src/schemas/auth.test.ts` | Auth schema validation tests |
| `packages/shared/src/schemas/grant.test.ts` | Grant schema validation tests |
| `packages/shared/src/schemas/practice.test.ts` | Practice schema validation tests |
| `apps/web/__tests__/actions/practices.test.ts` | Practice server actions tests |
| `apps/web/__tests__/actions/documents.test.ts` | Document server actions tests |
| `apps/web/__tests__/actions/grants.test.ts` | Grant server actions tests |

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.env.example`, `.npmrc`
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "finagevolata",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "prettier": "^3.4.0",
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 4: Create .npmrc**

```
auto-install-peers=true
```

- [ ] **Step 5: Create .env.example**

```bash
# Database (Supabase)
DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Email (Resend)
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="noreply@finagevolata.it"
```

- [ ] **Step 6: Create packages/db/package.json**

```json
{
  "name": "@finagevolata/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:push": "prisma db push",
    "prisma:seed": "tsx prisma/seed.ts",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.3.0"
  },
  "devDependencies": {
    "prisma": "^6.3.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 7: Create packages/db/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*.ts", "prisma/**/*.ts"]
}
```

- [ ] **Step 8: Create packages/shared/package.json**

```json
{
  "name": "@finagevolata/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 9: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 10: Create apps/web/package.json**

```json
{
  "name": "@finagevolata/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@finagevolata/db": "workspace:*",
    "@finagevolata/shared": "workspace:*",
    "@supabase/supabase-js": "^2.49.0",
    "next": "^15.2.0",
    "next-auth": "^5.0.0-beta.25",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "resend": "^4.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 11: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@finagevolata/shared", "@finagevolata/db"],
};

export default nextConfig;
```

- [ ] **Step 12: Create apps/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 13: Install dependencies and verify**

Run: `cd /Users/carlospenaranda/Proggetto_finanza_agevolata && pnpm install`
Expected: Lockfile created, all packages linked

- [ ] **Step 14: Verify turbo works**

Run: `pnpm turbo build --dry`
Expected: Shows task graph with 3 packages

- [ ] **Step 15: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .npmrc .env.example pnpm-lock.yaml \
  packages/db/package.json packages/db/tsconfig.json \
  packages/shared/package.json packages/shared/tsconfig.json \
  apps/web/package.json apps/web/tsconfig.json apps/web/next.config.ts
git commit -m "chore: scaffold monorepo with turborepo, pnpm workspaces"
```

---

## Task 2: Prisma Schema + Seed

**Files:**
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/seed.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create Prisma schema**

```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  ADMIN
  CONSULTANT
  COMPANY
}

enum CompanySize {
  MICRO
  SMALL
  MEDIUM
  LARGE
}

enum GrantType {
  FONDO_PERDUTO
  FINANZIAMENTO_AGEVOLATO
  CREDITO_IMPOSTA
  GARANZIA
}

enum GrantStatus {
  DRAFT
  PUBLISHED
  CLOSED
  EXPIRED
}

enum PracticeStatus {
  DRAFT
  DOCUMENTS_PENDING
  DOCUMENTS_REVIEW
  READY
  SUBMITTED
  WON
  LOST
}

enum ClickDayStatus {
  NONE
  REQUESTED
  SENT_TO_PARTNER
  SUBMITTED
  RANKED
  WON
  LOST
}

enum DocumentStatus {
  MISSING
  UPLOADED
  IN_REVIEW
  APPROVED
  REJECTED
}

enum DocumentCategory {
  LEGAL
  FINANCIAL
  FISCAL
  PROJECT
  CERTIFICATION
}

enum InvitationStatus {
  PENDING
  ACTIVE
  REVOKED
}

enum NotificationType {
  DOCUMENT_EXPIRING
  DOCUMENT_REQUESTED
  GRANT_DEADLINE
  PRACTICE_UPDATE
  DOCUMENT_REVIEWED
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String
  role          UserRole
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  companyProfile    CompanyProfile?
  consultantProfile ConsultantProfile?

  // Consultant relationships
  consultantInvitations ConsultantCompany[] @relation("ConsultantRelation")
  // Company relationships
  companyInvitations    ConsultantCompany[] @relation("CompanyRelation")

  practicesAsConsultant Practice[]         @relation("PracticeConsultant")
  practicesAsCompany    Practice[]         @relation("PracticeCompany")
  createdGrants         Grant[]
  reviewedDocuments     PracticeDocument[] @relation("DocumentReviewer")
  notifications         Notification[]

  @@map("users")
}

model CompanyProfile {
  id               String      @id @default(cuid())
  userId           String      @unique
  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  vatNumber        String      @unique
  companyName      String
  legalForm        String
  atecoCode        String
  atecoDescription String
  province         String
  region           String
  employeeCount    CompanySize
  annualRevenue    Decimal?
  foundedAt        DateTime?
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@map("company_profiles")
}

model ConsultantProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  firmName        String?
  specializations String[]
  maxClients      Int      @default(20)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("consultant_profiles")
}

model Grant {
  id                   String       @id @default(cuid())
  title                String
  description          String
  issuingBody          String
  grantType            GrantType
  minAmount            Decimal?
  maxAmount            Decimal?
  deadline             DateTime?
  openDate             DateTime?
  hasClickDay          Boolean      @default(false)
  clickDayDate         DateTime?
  status               GrantStatus  @default(DRAFT)
  eligibleAtecoCodes   String[]
  eligibleRegions      String[]
  eligibleCompanySizes CompanySize[]
  sourceUrl            String?
  approvedByAdmin      Boolean      @default(false)
  createdById          String
  createdBy            User         @relation(fields: [createdById], references: [id])
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  documentRequirements GrantDocumentRequirement[]
  practices            Practice[]

  @@map("grants")
}

model DocumentType {
  id              String           @id @default(cuid())
  name            String
  slug            String           @unique
  description     String
  validityDays    Int?
  acceptedFormats String[]
  maxSizeMb       Int              @default(10)
  category        DocumentCategory
  isStandard      Boolean          @default(true)

  grantRequirements GrantDocumentRequirement[]
  practiceDocuments PracticeDocument[]

  @@map("document_types")
}

model GrantDocumentRequirement {
  id             String       @id @default(cuid())
  grantId        String
  grant          Grant        @relation(fields: [grantId], references: [id], onDelete: Cascade)
  documentTypeId String
  documentType   DocumentType @relation(fields: [documentTypeId], references: [id])
  isRequired     Boolean      @default(true)
  notes          String?
  order          Int          @default(0)

  @@unique([grantId, documentTypeId])
  @@map("grant_document_requirements")
}

model Practice {
  id             String         @id @default(cuid())
  grantId        String
  grant          Grant          @relation(fields: [grantId], references: [id])
  companyId      String
  company        User           @relation("PracticeCompany", fields: [companyId], references: [id])
  consultantId   String
  consultant     User           @relation("PracticeConsultant", fields: [consultantId], references: [id])
  status         PracticeStatus @default(DRAFT)
  clickDayStatus ClickDayStatus @default(NONE)
  notes          String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  documents     PracticeDocument[]
  notifications Notification[]

  @@map("practices")
}

model PracticeDocument {
  id              String         @id @default(cuid())
  practiceId      String
  practice        Practice       @relation(fields: [practiceId], references: [id], onDelete: Cascade)
  documentTypeId  String
  documentType    DocumentType   @relation(fields: [documentTypeId], references: [id])
  status          DocumentStatus @default(MISSING)
  rejectionReason String?
  filePath        String?
  fileName        String?
  fileSize        Int?
  uploadedAt      DateTime?
  reviewedAt      DateTime?
  reviewedById    String?
  reviewedBy      User?          @relation("DocumentReviewer", fields: [reviewedById], references: [id])
  expiresAt       DateTime?
  version         Int            @default(0)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([practiceId, documentTypeId])
  @@map("practice_documents")
}

model ConsultantCompany {
  id           String           @id @default(cuid())
  consultantId String
  consultant   User             @relation("ConsultantRelation", fields: [consultantId], references: [id])
  companyId    String
  company      User             @relation("CompanyRelation", fields: [companyId], references: [id])
  status       InvitationStatus @default(PENDING)
  invitedAt    DateTime         @default(now())
  acceptedAt   DateTime?

  @@unique([consultantId, companyId])
  @@map("consultant_companies")
}

model Notification {
  id           String           @id @default(cuid())
  userId       String
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type         NotificationType
  title        String
  message      String
  practiceId   String?
  practice     Practice?        @relation(fields: [practiceId], references: [id])
  isRead       Boolean          @default(false)
  sentViaEmail Boolean          @default(false)
  createdAt    DateTime         @default(now())

  @@map("notifications")
}
```

- [ ] **Step 2: Create Prisma client export**

```typescript
// packages/db/src/index.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
```

- [ ] **Step 3: Create seed file**

```typescript
// packages/db/prisma/seed.ts
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
```

- [ ] **Step 4: Add bcryptjs dependency to db package**

Add `"bcryptjs": "^2.4.3"` to `packages/db/package.json` dependencies and `"@types/bcryptjs": "^2.4.6"` to devDependencies.

Run: `cd /Users/carlospenaranda/Proggetto_finanza_agevolata && pnpm install`

- [ ] **Step 5: Generate Prisma client and push schema**

Run: `cd packages/db && pnpm prisma:generate`
Expected: Prisma Client generated

Run: `cd packages/db && pnpm prisma:push`
Expected: Schema pushed to Supabase (requires DATABASE_URL set in `.env`)

Note: Create a `.env` at project root (copy from `.env.example`, fill in Supabase credentials). Prisma reads from `packages/db/prisma/` — add a `packages/db/.env` symlink or set `dotenv_path` in schema.

- [ ] **Step 6: Run seed**

Run: `cd packages/db && pnpm prisma:seed`
Expected: "Seeded 15 document types" + "Seeded admin user"

- [ ] **Step 7: Commit**

```bash
git add packages/db/
git commit -m "feat: add Prisma schema with all entities and seed data"
```

---

## Task 3: Shared Package — Types, Schemas, Constants

**Files:**
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/schemas/auth.ts`
- Create: `packages/shared/src/schemas/grant.ts`
- Create: `packages/shared/src/schemas/practice.ts`
- Create: `packages/shared/src/schemas/company.ts`
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/constants/document-types.ts`
- Create: `packages/shared/src/constants/regions.ts`
- Create: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/auth.test.ts`

- [ ] **Step 1: Write auth schema test**

```typescript
// packages/shared/src/schemas/auth.test.ts
import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth";

describe("registerSchema", () => {
  it("accepts valid registration", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario Rossi",
      password: "password123",
      role: "COMPANY",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario",
      password: "123",
      role: "COMPANY",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario",
      password: "password123",
      role: "SUPERADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects ADMIN role at registration", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      name: "Mario",
      password: "password123",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && pnpm test`
Expected: FAIL — module "./auth" not found

- [ ] **Step 3: Create types**

```typescript
// packages/shared/src/types/index.ts
export type UserRole = "ADMIN" | "CONSULTANT" | "COMPANY";
export type CompanySize = "MICRO" | "SMALL" | "MEDIUM" | "LARGE";
export type GrantType = "FONDO_PERDUTO" | "FINANZIAMENTO_AGEVOLATO" | "CREDITO_IMPOSTA" | "GARANZIA";
export type GrantStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "EXPIRED";
export type PracticeStatus = "DRAFT" | "DOCUMENTS_PENDING" | "DOCUMENTS_REVIEW" | "READY" | "SUBMITTED" | "WON" | "LOST";
export type ClickDayStatus = "NONE" | "REQUESTED" | "SENT_TO_PARTNER" | "SUBMITTED" | "RANKED" | "WON" | "LOST";
export type DocumentStatus = "MISSING" | "UPLOADED" | "IN_REVIEW" | "APPROVED" | "REJECTED";
export type DocumentCategory = "LEGAL" | "FINANCIAL" | "FISCAL" | "PROJECT" | "CERTIFICATION";
export type InvitationStatus = "PENDING" | "ACTIVE" | "REVOKED";
export type NotificationType = "DOCUMENT_EXPIRING" | "DOCUMENT_REQUESTED" | "GRANT_DEADLINE" | "PRACTICE_UPDATE" | "DOCUMENT_REVIEWED";
```

- [ ] **Step 4: Create auth schemas**

```typescript
// packages/shared/src/schemas/auth.ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  name: z.string().min(2, "Nome troppo corto"),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  role: z.enum(["CONSULTANT", "COMPANY"], {
    errorMap: () => ({ message: "Ruolo non valido" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm test`
Expected: All 5 tests PASS

- [ ] **Step 6: Create grant schemas**

```typescript
// packages/shared/src/schemas/grant.ts
import { z } from "zod";

export const grantCreateSchema = z.object({
  title: z.string().min(3, "Titolo troppo corto"),
  description: z.string().min(10, "Descrizione troppo corta"),
  issuingBody: z.string().min(2, "Ente emittente richiesto"),
  grantType: z.enum(["FONDO_PERDUTO", "FINANZIAMENTO_AGEVOLATO", "CREDITO_IMPOSTA", "GARANZIA"]),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  deadline: z.string().datetime().optional(),
  openDate: z.string().datetime().optional(),
  hasClickDay: z.boolean().default(false),
  clickDayDate: z.string().datetime().optional(),
  eligibleAtecoCodes: z.array(z.string()).default([]),
  eligibleRegions: z.array(z.string()).default([]),
  eligibleCompanySizes: z.array(z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"])).default([]),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  documentRequirements: z.array(z.object({
    documentTypeId: z.string(),
    isRequired: z.boolean().default(true),
    notes: z.string().optional(),
    order: z.number().default(0),
  })).default([]),
});

export const grantMatchFilters = z.object({
  atecoCode: z.string().optional(),
  region: z.string().optional(),
  companySize: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]).optional(),
});

export type GrantCreateInput = z.infer<typeof grantCreateSchema>;
export type GrantMatchFilters = z.infer<typeof grantMatchFilters>;
```

- [ ] **Step 7: Create practice and company schemas**

```typescript
// packages/shared/src/schemas/practice.ts
import { z } from "zod";

export const practiceCreateSchema = z.object({
  grantId: z.string().min(1),
  companyId: z.string().min(1),
});

export const documentReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
}).refine(
  (data) => data.status !== "REJECTED" || (data.rejectionReason && data.rejectionReason.length > 0),
  { message: "Motivo del rifiuto richiesto", path: ["rejectionReason"] }
);

export type PracticeCreateInput = z.infer<typeof practiceCreateSchema>;
export type DocumentReviewInput = z.infer<typeof documentReviewSchema>;
```

```typescript
// packages/shared/src/schemas/company.ts
import { z } from "zod";

export const companyOnboardingSchema = z.object({
  vatNumber: z.string().regex(/^\d{11}$/, "Partita IVA deve essere di 11 cifre"),
  companyName: z.string().min(2, "Ragione sociale richiesta"),
  legalForm: z.string().min(2, "Forma giuridica richiesta"),
  atecoCode: z.string().min(2, "Codice ATECO richiesto"),
  atecoDescription: z.string().min(2, "Descrizione ATECO richiesta"),
  province: z.string().min(2, "Provincia richiesta"),
  region: z.string().min(2, "Regione richiesta"),
  employeeCount: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]),
  annualRevenue: z.number().positive().optional(),
  foundedAt: z.string().datetime().optional(),
});

export const companyInviteSchema = z.object({
  companyEmail: z.string().email("Email non valida"),
});

export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;
export type CompanyInviteInput = z.infer<typeof companyInviteSchema>;
```

- [ ] **Step 8: Create schemas index**

```typescript
// packages/shared/src/schemas/index.ts
export * from "./auth";
export * from "./grant";
export * from "./practice";
export * from "./company";
```

- [ ] **Step 9: Create constants**

```typescript
// packages/shared/src/constants/document-types.ts
export const STANDARD_DOCUMENT_TYPES = [
  { slug: "visura-camerale", name: "Visura Camerale", category: "LEGAL", validityDays: 180 },
  { slug: "durc", name: "DURC", category: "LEGAL", validityDays: 120 },
  { slug: "dsan", name: "DSAN", category: "LEGAL", validityDays: null },
  { slug: "bilanci", name: "Bilanci Depositati", category: "FINANCIAL", validityDays: null },
  { slug: "business-plan", name: "Business Plan", category: "PROJECT", validityDays: null },
  { slug: "de-minimis", name: "Dichiarazione de minimis", category: "FISCAL", validityDays: null },
  { slug: "preventivi", name: "Preventivi Fornitori", category: "PROJECT", validityDays: null },
  { slug: "antimafia", name: "Dichiarazione Antimafia", category: "LEGAL", validityDays: null },
  { slug: "antiriciclaggio", name: "Dichiarazione Antiriciclaggio", category: "LEGAL", validityDays: null },
  { slug: "contabilita-separata", name: "Impegno Contabilità Separata", category: "FINANCIAL", validityDays: null },
  { slug: "documento-identita", name: "Documento Identità", category: "LEGAL", validityDays: null },
  { slug: "firma-digitale", name: "Firma Digitale", category: "LEGAL", validityDays: null },
  { slug: "ateco", name: "Certificato ATECO", category: "LEGAL", validityDays: null },
  { slug: "dichiarazioni-fiscali", name: "Dichiarazioni Fiscali", category: "FISCAL", validityDays: null },
  { slug: "certificazioni", name: "Certificazioni Specifiche", category: "CERTIFICATION", validityDays: null },
] as const;
```

```typescript
// packages/shared/src/constants/regions.ts
export const ITALIAN_REGIONS = [
  "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna",
  "Friuli Venezia Giulia", "Lazio", "Liguria", "Lombardia", "Marche",
  "Molise", "Piemonte", "Puglia", "Sardegna", "Sicilia",
  "Toscana", "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto",
] as const;

export type ItalianRegion = typeof ITALIAN_REGIONS[number];
```

```typescript
// packages/shared/src/constants/index.ts
export * from "./document-types";
export * from "./regions";
```

- [ ] **Step 10: Create shared package index**

```typescript
// packages/shared/src/index.ts
export * from "./types";
export * from "./schemas";
export * from "./constants";
```

- [ ] **Step 11: Create vitest config**

```typescript
// packages/shared/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 12: Run all tests**

Run: `cd packages/shared && pnpm test`
Expected: All tests PASS

- [ ] **Step 13: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types, Zod schemas, and constants"
```

---

## Task 4: Matching Service

**Files:**
- Create: `packages/shared/src/services/matching.ts`
- Test: `packages/shared/src/services/matching.test.ts`

- [ ] **Step 1: Write matching test**

```typescript
// packages/shared/src/services/matching.test.ts
import { describe, it, expect } from "vitest";
import { isGrantEligible } from "./matching";

const baseCompany = {
  atecoCode: "28.99",
  region: "Lombardia",
  employeeCount: "SMALL" as const,
};

const baseGrant = {
  eligibleAtecoCodes: [] as string[],
  eligibleRegions: [] as string[],
  eligibleCompanySizes: [] as string[],
  status: "PUBLISHED" as const,
  deadline: new Date(Date.now() + 86400000).toISOString(), // tomorrow
};

describe("isGrantEligible", () => {
  it("matches when grant has no restrictions (empty arrays = all eligible)", () => {
    expect(isGrantEligible(baseGrant, baseCompany)).toBe(true);
  });

  it("matches when ATECO code is in eligible list", () => {
    const grant = { ...baseGrant, eligibleAtecoCodes: ["28.99", "29.10"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("matches ATECO prefix (28.99 matches 28)", () => {
    const grant = { ...baseGrant, eligibleAtecoCodes: ["28"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("rejects when ATECO code is not in eligible list", () => {
    const grant = { ...baseGrant, eligibleAtecoCodes: ["10.11", "20.30"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("matches when region is in eligible list", () => {
    const grant = { ...baseGrant, eligibleRegions: ["Lombardia", "Piemonte"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("rejects when region is not in eligible list", () => {
    const grant = { ...baseGrant, eligibleRegions: ["Sicilia"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("matches when company size is in eligible list", () => {
    const grant = { ...baseGrant, eligibleCompanySizes: ["MICRO", "SMALL"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });

  it("rejects when company size is not in eligible list", () => {
    const grant = { ...baseGrant, eligibleCompanySizes: ["LARGE"] };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("rejects expired grants", () => {
    const grant = { ...baseGrant, deadline: new Date("2020-01-01").toISOString() };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("rejects non-published grants", () => {
    const grant = { ...baseGrant, status: "DRAFT" as const };
    expect(isGrantEligible(grant, baseCompany)).toBe(false);
  });

  it("accepts grants with no deadline", () => {
    const grant = { ...baseGrant, deadline: null };
    expect(isGrantEligible(grant, baseCompany)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared && pnpm test`
Expected: FAIL — module "./matching" not found

- [ ] **Step 3: Implement matching service**

```typescript
// packages/shared/src/services/matching.ts
interface GrantForMatching {
  eligibleAtecoCodes: string[];
  eligibleRegions: string[];
  eligibleCompanySizes: string[];
  status: string;
  deadline: string | null;
}

interface CompanyForMatching {
  atecoCode: string;
  region: string;
  employeeCount: string;
}

export function isGrantEligible(
  grant: GrantForMatching,
  company: CompanyForMatching
): boolean {
  if (grant.status !== "PUBLISHED") return false;

  if (grant.deadline && new Date(grant.deadline) < new Date()) return false;

  if (grant.eligibleAtecoCodes.length > 0) {
    const matches = grant.eligibleAtecoCodes.some(
      (code) =>
        company.atecoCode === code || company.atecoCode.startsWith(code + ".")
    );
    if (!matches) return false;
  }

  if (grant.eligibleRegions.length > 0) {
    if (!grant.eligibleRegions.includes(company.region)) return false;
  }

  if (grant.eligibleCompanySizes.length > 0) {
    if (!grant.eligibleCompanySizes.includes(company.employeeCount))
      return false;
  }

  return true;
}
```

- [ ] **Step 4: Update shared index to export services**

Add to `packages/shared/src/index.ts`:
```typescript
export * from "./services/matching";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/shared && pnpm test`
Expected: All 11+ tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/services/
git commit -m "feat: add grant-company matching service with tests"
```

---

## Task 5: Next.js App Shell + Auth

**Files:**
- Create: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- Create: `apps/web/lib/auth.ts`, `apps/web/lib/prisma.ts`, `apps/web/lib/supabase.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/middleware.ts`
- Create: `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(auth)/register/page.tsx`
- Create: `apps/web/lib/actions/auth.ts`
- Create: `apps/web/app/globals.css`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.mjs`

- [ ] **Step 1: Create Tailwind + PostCSS config**

```css
/* apps/web/app/globals.css */
@import "tailwindcss";
```

```typescript
// apps/web/postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

- [ ] **Step 2: Create Prisma client singleton for Next.js**

```typescript
// apps/web/lib/prisma.ts
import { prisma } from "@finagevolata/db";

export { prisma };
```

- [ ] **Step 3: Create Supabase clients**

```typescript
// apps/web/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export function createBrowserSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Configure NextAuth.js v5**

```typescript
// apps/web/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "@finagevolata/shared";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const passwordMatch = await compare(parsed.data.password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

- [ ] **Step 5: Create NextAuth API route**

```typescript
// apps/web/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 6: Create middleware**

```typescript
// apps/web/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboard = pathname.startsWith("/consulente") ||
    pathname.startsWith("/azienda") ||
    pathname.startsWith("/admin");

  if (isAuthPage && isLoggedIn) {
    const role = (req.auth?.user as any)?.role;
    const redirect = role === "CONSULTANT" ? "/consulente" :
      role === "COMPANY" ? "/azienda" :
      role === "ADMIN" ? "/admin" : "/";
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based route protection
  if (isLoggedIn && isDashboard) {
    const role = (req.auth?.user as any)?.role;
    if (pathname.startsWith("/consulente") && role !== "CONSULTANT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/azienda") && role !== "COMPANY") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 7: Create root layout**

```tsx
// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinAgevolata - Piattaforma Finanza Agevolata",
  description: "Gestisci bandi e documenti per la finanza agevolata",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create landing page (redirect)**

```tsx
// apps/web/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 9: Create register server action**

```typescript
// apps/web/lib/actions/auth.ts
"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@finagevolata/shared";

export async function registerUser(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "Email già registrata" };
  }

  const hashedPassword = await hash(parsed.data.password, 12);

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashedPassword,
      role: parsed.data.role,
    },
  });

  return { success: true };
}
```

- [ ] **Step 10: Create login page**

```tsx
// apps/web/app/(auth)/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Email o password non validi");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Accedi a FinAgevolata</h1>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <button type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition">
            Accedi
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          Non hai un account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">Registrati</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Create register page**

```tsx
// apps/web/app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await registerUser(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Registrati su FinAgevolata</h1>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome completo</label>
            <input id="name" name="name" type="text" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" required minLength={8}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Sono un...</label>
            <select id="role" name="role" required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="">Seleziona ruolo</option>
              <option value="CONSULTANT">Consulente di finanza agevolata</option>
              <option value="COMPANY">Azienda</option>
            </select>
          </div>
          <button type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition">
            Registrati
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          Hai già un account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">Accedi</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Add bcryptjs and next-auth session provider dependencies**

Ensure `bcryptjs` and `@types/bcryptjs` are in `apps/web/package.json` dependencies.

Run: `cd /Users/carlospenaranda/Proggetto_finanza_agevolata && pnpm install`

- [ ] **Step 13: Verify dev server starts**

Run: `cd /Users/carlospenaranda/Proggetto_finanza_agevolata && pnpm --filter web dev`
Expected: Next.js dev server at http://localhost:3000, login page renders

- [ ] **Step 14: Commit**

```bash
git add apps/web/
git commit -m "feat: add Next.js app shell with NextAuth, login, and register"
```

---

## Task 6: Dashboard Shell + Role-Based Navigation

**Files:**
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/components/dashboard-shell.tsx`
- Create: `apps/web/app/(dashboard)/consulente/page.tsx`
- Create: `apps/web/app/(dashboard)/azienda/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1: Initialize shadcn/ui**

Run: `cd apps/web && npx shadcn@latest init`
Choose: New York style, Zinc color, CSS variables yes.

Then add base components:
Run: `npx shadcn@latest add button card badge table dialog input select textarea dropdown-menu separator avatar`

- [ ] **Step 2: Create dashboard shell component**

```tsx
// apps/web/components/dashboard-shell.tsx
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

const NAV_ITEMS = {
  CONSULTANT: [
    { label: "Dashboard", href: "/consulente" },
    { label: "Clienti", href: "/consulente/clienti" },
    { label: "Pratiche", href: "/consulente/pratiche" },
    { label: "Bandi", href: "/consulente/bandi" },
  ],
  COMPANY: [
    { label: "Dashboard", href: "/azienda" },
    { label: "Pratiche", href: "/azienda/pratiche" },
    { label: "Bandi", href: "/azienda/bandi" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    { label: "Bandi", href: "/admin/bandi" },
    { label: "Utenti", href: "/admin/utenti" },
  ],
};

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as keyof typeof NAV_ITEMS;
  const navItems = NAV_ITEMS[role] || [];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-4">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900">FinAgevolata</h2>
          <p className="text-xs text-gray-500">{session.user.name}</p>
          <p className="text-xs text-gray-400 capitalize">{role.toLowerCase()}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-auto pt-8"
        >
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
            Esci
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard layout**

```tsx
// apps/web/app/(dashboard)/layout.tsx
import { DashboardShell } from "@/components/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
```

- [ ] **Step 4: Create consultant home page**

```tsx
// apps/web/app/(dashboard)/consulente/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ConsultantDashboard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const [clientCount, practiceCount, pendingDocs] = await Promise.all([
    prisma.consultantCompany.count({ where: { consultantId: userId, status: "ACTIVE" } }),
    prisma.practice.count({ where: { consultantId: userId } }),
    prisma.practiceDocument.count({
      where: {
        practice: { consultantId: userId },
        status: "UPLOADED",
      },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Consulente</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Clienti attivi</p>
          <p className="text-3xl font-bold">{clientCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Pratiche</p>
          <p className="text-3xl font-bold">{practiceCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Documenti da revisionare</p>
          <p className="text-3xl font-bold">{pendingDocs}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create company home page**

```tsx
// apps/web/app/(dashboard)/azienda/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CompanyDashboard() {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  const [practiceCount, missingDocs, rejectedDocs] = await Promise.all([
    prisma.practice.count({ where: { companyId: userId } }),
    prisma.practiceDocument.count({
      where: { practice: { companyId: userId }, status: "MISSING" },
    }),
    prisma.practiceDocument.count({
      where: { practice: { companyId: userId }, status: "REJECTED" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Azienda</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Pratiche attive</p>
          <p className="text-3xl font-bold">{practiceCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Documenti mancanti</p>
          <p className="text-3xl font-bold text-amber-600">{missingDocs}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Documenti rifiutati</p>
          <p className="text-3xl font-bold text-red-600">{rejectedDocs}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create admin home page**

```tsx
// apps/web/app/(dashboard)/admin/page.tsx
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [userCount, grantCount, practiceCount, pendingGrants] = await Promise.all([
    prisma.user.count(),
    prisma.grant.count({ where: { status: "PUBLISHED" } }),
    prisma.practice.count(),
    prisma.grant.count({ where: { approvedByAdmin: false, status: "DRAFT" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Utenti totali</p>
          <p className="text-3xl font-bold">{userCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Bandi attivi</p>
          <p className="text-3xl font-bold">{grantCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Pratiche totali</p>
          <p className="text-3xl font-bold">{practiceCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <p className="text-sm text-gray-500">Bandi da approvare</p>
          <p className="text-3xl font-bold text-amber-600">{pendingGrants}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify all three dashboards render**

Run: `pnpm --filter web dev`
Login as admin → see admin dashboard. Register as consultant → see consultant dashboard. Register as company → see company dashboard.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/ apps/web/app/\(dashboard\)/
git commit -m "feat: add dashboard shell with role-based navigation and home pages"
```

---

## Task 7: Company Onboarding + Consultant Client Management

**Files:**
- Create: `apps/web/app/(auth)/onboarding/page.tsx`
- Create: `apps/web/lib/actions/companies.ts`
- Create: `apps/web/app/(dashboard)/consulente/clienti/page.tsx`

- [ ] **Step 1: Create company onboarding server actions**

```typescript
// apps/web/lib/actions/companies.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { companyOnboardingSchema, companyInviteSchema } from "@finagevolata/shared";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "COMPANY") {
    return { error: "Non autorizzato" };
  }

  const raw = {
    vatNumber: formData.get("vatNumber") as string,
    companyName: formData.get("companyName") as string,
    legalForm: formData.get("legalForm") as string,
    atecoCode: formData.get("atecoCode") as string,
    atecoDescription: formData.get("atecoDescription") as string,
    province: formData.get("province") as string,
    region: formData.get("region") as string,
    employeeCount: formData.get("employeeCount") as string,
  };

  const parsed = companyOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const existing = await prisma.companyProfile.findUnique({
    where: { vatNumber: parsed.data.vatNumber },
  });
  if (existing) {
    return { error: "Partita IVA già registrata" };
  }

  await prisma.companyProfile.create({
    data: {
      userId: (session.user as any).id,
      ...parsed.data,
    },
  });

  return { success: true };
}

export async function inviteCompany(formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  const parsed = companyInviteSchema.safeParse({
    companyEmail: formData.get("companyEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const company = await prisma.user.findUnique({
    where: { email: parsed.data.companyEmail, role: "COMPANY" },
  });
  if (!company) {
    return { error: "Nessuna azienda trovata con questa email" };
  }

  const existingRelation = await prisma.consultantCompany.findUnique({
    where: {
      consultantId_companyId: {
        consultantId: (session.user as any).id,
        companyId: company.id,
      },
    },
  });
  if (existingRelation) {
    return { error: "Invito già inviato a questa azienda" };
  }

  await prisma.consultantCompany.create({
    data: {
      consultantId: (session.user as any).id,
      companyId: company.id,
    },
  });

  return { success: true };
}

export async function respondToInvitation(invitationId: string, accept: boolean) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "COMPANY") {
    return { error: "Non autorizzato" };
  }

  const invitation = await prisma.consultantCompany.findUnique({
    where: { id: invitationId, companyId: (session.user as any).id },
  });
  if (!invitation || invitation.status !== "PENDING") {
    return { error: "Invito non trovato" };
  }

  await prisma.consultantCompany.update({
    where: { id: invitationId },
    data: {
      status: accept ? "ACTIVE" : "REVOKED",
      acceptedAt: accept ? new Date() : undefined,
    },
  });

  return { success: true };
}

export async function getMyClients() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "CONSULTANT") return [];

  return prisma.consultantCompany.findMany({
    where: { consultantId: (session.user as any).id },
    include: {
      company: {
        include: { companyProfile: true },
      },
    },
    orderBy: { invitedAt: "desc" },
  });
}
```

- [ ] **Step 2: Create onboarding page**

```tsx
// apps/web/app/(auth)/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/lib/actions/companies";
import { ITALIAN_REGIONS } from "@finagevolata/shared";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await completeOnboarding(formData);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/azienda");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-lg space-y-6 rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Completa il profilo aziendale</h1>
        <p className="text-center text-sm text-gray-500">Inserisci i dati della tua azienda per iniziare</p>
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Partita IVA</label>
              <input name="vatNumber" type="text" required maxLength={11} pattern="\d{11}"
                placeholder="12345678901"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Ragione Sociale</label>
              <input name="companyName" type="text" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Forma Giuridica</label>
              <select name="legalForm" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
                <option value="">Seleziona</option>
                <option value="SRL">SRL</option>
                <option value="SRLS">SRLS</option>
                <option value="SPA">SPA</option>
                <option value="SNC">SNC</option>
                <option value="SAS">SAS</option>
                <option value="DITTA_INDIVIDUALE">Ditta Individuale</option>
                <option value="COOPERATIVA">Cooperativa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dimensione</label>
              <select name="employeeCount" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
                <option value="">Seleziona</option>
                <option value="MICRO">Micro (&lt;10 dipendenti)</option>
                <option value="SMALL">Piccola (10-49)</option>
                <option value="MEDIUM">Media (50-249)</option>
                <option value="LARGE">Grande (250+)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Codice ATECO</label>
              <input name="atecoCode" type="text" required placeholder="28.99"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Descrizione ATECO</label>
              <input name="atecoDescription" type="text" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Regione</label>
              <select name="region" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm">
                <option value="">Seleziona</option>
                {ITALIAN_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia</label>
              <input name="province" type="text" required placeholder="MI"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition">
            Salva e continua
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create consultant client list page**

```tsx
// apps/web/app/(dashboard)/consulente/clienti/page.tsx
import { getMyClients, inviteCompany } from "@/lib/actions/companies";

export default async function ClientiPage() {
  const clients = await getMyClients();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">I miei clienti</h1>
      </div>

      <div className="rounded-lg border bg-white p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Invita un&apos;azienda</h2>
        <form action={inviteCompany} className="flex gap-3">
          <input name="companyEmail" type="email" required placeholder="email@azienda.it"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700">
            Invita
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azienda</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">P.IVA</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Regione</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Stato</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-4 py-3 text-sm">{c.company.companyProfile?.companyName || c.company.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.company.companyProfile?.vatNumber || "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.company.companyProfile?.region || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    c.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    c.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {c.status === "ACTIVE" ? "Attivo" : c.status === "PENDING" ? "In attesa" : "Revocato"}
                  </span>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nessun cliente ancora. Invita la prima azienda!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify onboarding flow and client management**

Run: `pnpm --filter web dev`
1. Register as COMPANY → redirect to onboarding → fill form → redirect to /azienda
2. Register as CONSULTANT → go to /consulente/clienti → invite company email → see pending

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(auth\)/onboarding/ apps/web/lib/actions/companies.ts apps/web/app/\(dashboard\)/consulente/clienti/
git commit -m "feat: add company onboarding and consultant client management"
```

---

## Task 8: Grant CRUD + Admin Approval

**Files:**
- Create: `apps/web/lib/actions/grants.ts`
- Create: `apps/web/app/(dashboard)/admin/bandi/page.tsx`
- Create: `apps/web/app/(dashboard)/consulente/bandi/page.tsx`
- Create: `apps/web/app/(dashboard)/azienda/bandi/page.tsx`
- Create: `apps/web/components/grant-card.tsx`

This task implements grant creation (admin + consultant), admin approval of consultant-created grants, grant listing for all roles, and grant matching for companies. The grant creation form, grant card component, and matching query are all included. Follow the same patterns from previous tasks (server actions with Zod validation, server components for data fetching, client components for forms). The implementation agent should refer to `grantCreateSchema` from `@finagevolata/shared` for validation and `isGrantEligible` from `@finagevolata/shared` for matching logic.

- [ ] **Step 1: Create grant server actions**

Create `apps/web/lib/actions/grants.ts` with these server actions:
- `createGrant(formData)` — validates with `grantCreateSchema`, sets `approvedByAdmin: true` if admin, `false` if consultant. Creates grant + `GrantDocumentRequirement` records.
- `getGrants(filters?)` — returns grants filtered by role: admin sees all, consultant sees published + own drafts, company sees published only.
- `getMatchingGrants(companyId)` — fetches company profile, fetches published grants, filters with `isGrantEligible()`.
- `approveGrant(grantId)` — admin only, sets `approvedByAdmin: true` and `status: PUBLISHED`.

```typescript
// apps/web/lib/actions/grants.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { grantCreateSchema, isGrantEligible } from "@finagevolata/shared";

export async function createGrant(formData: FormData) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "CONSULTANT")) {
    return { error: "Non autorizzato" };
  }

  const raw = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    issuingBody: formData.get("issuingBody") as string,
    grantType: formData.get("grantType") as string,
    minAmount: formData.get("minAmount") ? Number(formData.get("minAmount")) : undefined,
    maxAmount: formData.get("maxAmount") ? Number(formData.get("maxAmount")) : undefined,
    deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string).toISOString() : undefined,
    openDate: formData.get("openDate") ? new Date(formData.get("openDate") as string).toISOString() : undefined,
    hasClickDay: formData.get("hasClickDay") === "true",
    clickDayDate: formData.get("clickDayDate") ? new Date(formData.get("clickDayDate") as string).toISOString() : undefined,
    eligibleAtecoCodes: formData.get("eligibleAtecoCodes") ? (formData.get("eligibleAtecoCodes") as string).split(",").map(s => s.trim()).filter(Boolean) : [],
    eligibleRegions: formData.getAll("eligibleRegions") as string[],
    eligibleCompanySizes: formData.getAll("eligibleCompanySizes") as string[],
    sourceUrl: formData.get("sourceUrl") as string || "",
    documentRequirements: [],
  };

  const parsed = grantCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const isAdmin = role === "ADMIN";

  await prisma.grant.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      issuingBody: parsed.data.issuingBody,
      grantType: parsed.data.grantType,
      minAmount: parsed.data.minAmount,
      maxAmount: parsed.data.maxAmount,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      openDate: parsed.data.openDate ? new Date(parsed.data.openDate) : null,
      hasClickDay: parsed.data.hasClickDay,
      clickDayDate: parsed.data.clickDayDate ? new Date(parsed.data.clickDayDate) : null,
      eligibleAtecoCodes: parsed.data.eligibleAtecoCodes,
      eligibleRegions: parsed.data.eligibleRegions,
      eligibleCompanySizes: parsed.data.eligibleCompanySizes,
      sourceUrl: parsed.data.sourceUrl || null,
      createdById: (session.user as any).id,
      approvedByAdmin: isAdmin,
      status: isAdmin ? "PUBLISHED" : "DRAFT",
    },
  });

  return { success: true };
}

export async function getGrants() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role === "ADMIN") {
    return prisma.grant.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } });
  }
  if (role === "CONSULTANT") {
    return prisma.grant.findMany({
      where: {
        OR: [
          { status: "PUBLISHED", approvedByAdmin: true },
          { createdById: (session?.user as any).id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }
  // COMPANY: only published
  return prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMatchingGrants(companyId: string) {
  const profile = await prisma.companyProfile.findUnique({ where: { userId: companyId } });
  if (!profile) return [];

  const grants = await prisma.grant.findMany({
    where: { status: "PUBLISHED", approvedByAdmin: true },
  });

  return grants.filter((grant) =>
    isGrantEligible(
      {
        eligibleAtecoCodes: grant.eligibleAtecoCodes,
        eligibleRegions: grant.eligibleRegions,
        eligibleCompanySizes: grant.eligibleCompanySizes,
        status: grant.status,
        deadline: grant.deadline?.toISOString() ?? null,
      },
      {
        atecoCode: profile.atecoCode,
        region: profile.region,
        employeeCount: profile.employeeCount,
      }
    )
  );
}

export async function approveGrant(grantId: string) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return { error: "Non autorizzato" };
  }

  await prisma.grant.update({
    where: { id: grantId },
    data: { approvedByAdmin: true, status: "PUBLISHED" },
  });

  return { success: true };
}
```

- [ ] **Step 2: Create grant card component**

```tsx
// apps/web/components/grant-card.tsx
import type { Grant } from "@finagevolata/db";

export function GrantCard({ grant }: { grant: Grant }) {
  const isExpired = grant.deadline && new Date(grant.deadline) < new Date();

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{grant.title}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
          grant.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
          grant.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-500"
        }`}>
          {grant.status === "PUBLISHED" ? "Attivo" :
           grant.status === "DRAFT" ? "Bozza" :
           grant.status === "CLOSED" ? "Chiuso" : "Scaduto"}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{grant.issuingBody}</p>
      <p className="text-sm text-gray-700 line-clamp-2 mb-3">{grant.description}</p>
      <div className="flex gap-4 text-xs text-gray-500">
        {grant.maxAmount && <span>Fino a €{Number(grant.maxAmount).toLocaleString("it-IT")}</span>}
        {grant.deadline && (
          <span className={isExpired ? "text-red-500" : ""}>
            Scadenza: {new Date(grant.deadline).toLocaleDateString("it-IT")}
          </span>
        )}
        {grant.hasClickDay && <span className="text-blue-600 font-medium">Click Day</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin bandi page**

Create `apps/web/app/(dashboard)/admin/bandi/page.tsx` — lists all grants with approve button for consultant-submitted drafts, and a form to create new grants. Uses `getGrants()`, `createGrant()`, and `approveGrant()`.

- [ ] **Step 4: Create consultant bandi page**

Create `apps/web/app/(dashboard)/consulente/bandi/page.tsx` — lists published grants + own drafts, form to create new grants. Uses `getGrants()` and `createGrant()`.

- [ ] **Step 5: Create company bandi page with matching**

Create `apps/web/app/(dashboard)/azienda/bandi/page.tsx` — shows grants matching the company profile using `getMatchingGrants()`. Uses `GrantCard` component.

- [ ] **Step 6: Verify grant flow**

1. Admin creates a grant → appears as PUBLISHED
2. Consultant creates a grant → appears as DRAFT
3. Admin approves → PUBLISHED
4. Company with matching profile sees it in /azienda/bandi

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/actions/grants.ts apps/web/components/grant-card.tsx \
  apps/web/app/\(dashboard\)/admin/bandi/ apps/web/app/\(dashboard\)/consulente/bandi/ \
  apps/web/app/\(dashboard\)/azienda/bandi/
git commit -m "feat: add grant CRUD, admin approval, and company matching"
```

---

## Task 9: Practice Management + Document Checklist

**Files:**
- Create: `apps/web/lib/actions/practices.ts`
- Create: `apps/web/app/(dashboard)/consulente/pratiche/page.tsx`
- Create: `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx`
- Create: `apps/web/app/(dashboard)/azienda/pratiche/page.tsx`
- Create: `apps/web/app/(dashboard)/azienda/pratiche/[id]/page.tsx`
- Create: `apps/web/components/document-checklist.tsx`
- Create: `apps/web/components/practice-status-badge.tsx`

This is the core task — creating a practice auto-generates `PracticeDocument` rows from the grant's `GrantDocumentRequirement` entries. The consultant sees a checklist overview, the company sees upload slots.

- [ ] **Step 1: Create practice server actions**

Create `apps/web/lib/actions/practices.ts` with:
- `createPractice(formData)` — validates with `practiceCreateSchema`, verifies consultant owns the company (via ConsultantCompany), creates Practice + auto-generates PracticeDocument rows (one per GrantDocumentRequirement, all status MISSING). Sets expiresAt based on DocumentType.validityDays if present.
- `getPractices()` — filtered by role: consultant sees own, company sees own, admin sees all. Includes grant, company profile, document counts by status.
- `getPractice(id)` — single practice with all documents, grant info, company info. Validates access by role.
- `updatePracticeStatus(practiceId, status)` — consultant only, updates practice status.

```typescript
// apps/web/lib/actions/practices.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceCreateSchema } from "@finagevolata/shared";

export async function createPractice(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (!userId || role !== "CONSULTANT") return { error: "Non autorizzato" };

  const parsed = practiceCreateSchema.safeParse({
    grantId: formData.get("grantId"),
    companyId: formData.get("companyId"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Verify consultant-company relationship
  const relation = await prisma.consultantCompany.findUnique({
    where: {
      consultantId_companyId: { consultantId: userId, companyId: parsed.data.companyId },
      status: "ACTIVE",
    },
  });
  if (!relation) return { error: "Non sei collegato a questa azienda" };

  // Get grant with document requirements
  const grant = await prisma.grant.findUnique({
    where: { id: parsed.data.grantId },
    include: { documentRequirements: { include: { documentType: true } } },
  });
  if (!grant || grant.status !== "PUBLISHED") return { error: "Bando non trovato o non attivo" };

  // Create practice + auto-generate document rows
  const practice = await prisma.practice.create({
    data: {
      grantId: grant.id,
      companyId: parsed.data.companyId,
      consultantId: userId,
      status: "DOCUMENTS_PENDING",
      documents: {
        create: grant.documentRequirements.map((req) => ({
          documentTypeId: req.documentTypeId,
          status: "MISSING",
          expiresAt: req.documentType.validityDays
            ? new Date(Date.now() + req.documentType.validityDays * 86400000)
            : null,
        })),
      },
    },
  });

  return { success: true, practiceId: practice.id };
}

export async function getPractices() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  const where = role === "ADMIN" ? {} :
    role === "CONSULTANT" ? { consultantId: userId } :
    { companyId: userId };

  return prisma.practice.findMany({
    where,
    include: {
      grant: true,
      company: { include: { companyProfile: true } },
      consultant: true,
      _count: { select: { documents: true } },
      documents: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPractice(id: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  const practice = await prisma.practice.findUnique({
    where: { id },
    include: {
      grant: true,
      company: { include: { companyProfile: true } },
      consultant: { include: { consultantProfile: true } },
      documents: {
        include: { documentType: true, reviewedBy: true },
        orderBy: { documentType: { name: "asc" } },
      },
    },
  });

  if (!practice) return null;

  // Access control
  if (role === "CONSULTANT" && practice.consultantId !== userId) return null;
  if (role === "COMPANY" && practice.companyId !== userId) return null;

  return practice;
}

export async function updatePracticeStatus(practiceId: string, status: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  if (role !== "CONSULTANT") return { error: "Non autorizzato" };

  const practice = await prisma.practice.findUnique({ where: { id: practiceId } });
  if (!practice || practice.consultantId !== userId) return { error: "Pratica non trovata" };

  await prisma.practice.update({
    where: { id: practiceId },
    data: { status: status as any },
  });

  return { success: true };
}
```

- [ ] **Step 2: Create practice status badge component**

```tsx
// apps/web/components/practice-status-badge.tsx
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bozza", className: "bg-gray-100 text-gray-700" },
  DOCUMENTS_PENDING: { label: "Documenti in attesa", className: "bg-yellow-100 text-yellow-700" },
  DOCUMENTS_REVIEW: { label: "In revisione", className: "bg-blue-100 text-blue-700" },
  READY: { label: "Pronta", className: "bg-green-100 text-green-700" },
  SUBMITTED: { label: "Inviata", className: "bg-purple-100 text-purple-700" },
  WON: { label: "Vinta", className: "bg-emerald-100 text-emerald-700" },
  LOST: { label: "Persa", className: "bg-red-100 text-red-700" },
};

export function PracticeStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
```

- [ ] **Step 3: Create document checklist component**

```tsx
// apps/web/components/document-checklist.tsx
const DOC_STATUS_MAP: Record<string, { label: string; className: string }> = {
  MISSING: { label: "Mancante", className: "bg-red-100 text-red-700" },
  UPLOADED: { label: "Caricato", className: "bg-blue-100 text-blue-700" },
  IN_REVIEW: { label: "In revisione", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approvato", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rifiutato", className: "bg-red-100 text-red-700" },
};

interface PracticeDoc {
  id: string;
  status: string;
  rejectionReason: string | null;
  fileName: string | null;
  expiresAt: Date | null;
  version: number;
  documentType: { name: string; slug: string; category: string };
}

export function DocumentChecklist({
  documents,
  showActions,
}: {
  documents: PracticeDoc[];
  showActions?: "upload" | "review";
}) {
  const approved = documents.filter((d) => d.status === "APPROVED").length;
  const total = documents.length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${total > 0 ? (approved / total) * 100 : 0}%` }}
          />
        </div>
        <span className="text-sm text-gray-500">{approved}/{total}</span>
      </div>
      <div className="space-y-2">
        {documents.map((doc) => {
          const config = DOC_STATUS_MAP[doc.status] || DOC_STATUS_MAP.MISSING;
          const isExpiringSoon = doc.expiresAt && new Date(doc.expiresAt).getTime() - Date.now() < 30 * 86400000;

          return (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{doc.documentType.name}</p>
                {doc.fileName && <p className="text-xs text-gray-500">{doc.fileName} (v{doc.version})</p>}
                {doc.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1">Motivo: {doc.rejectionReason}</p>
                )}
                {isExpiringSoon && doc.expiresAt && (
                  <p className="text-xs text-amber-600 mt-1">
                    Scade il {new Date(doc.expiresAt).toLocaleDateString("it-IT")}
                  </p>
                )}
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${config.className}`}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create consultant practices list + detail pages**

Create `apps/web/app/(dashboard)/consulente/pratiche/page.tsx` — lists practices with grant name, company name, status badge, document progress. Button to create new practice (select grant + client).

Create `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx` — shows practice detail with DocumentChecklist (showActions="review"), review form per document (approve/reject with reason).

- [ ] **Step 5: Create company practices list + detail pages**

Create `apps/web/app/(dashboard)/azienda/pratiche/page.tsx` — lists company's practices.

Create `apps/web/app/(dashboard)/azienda/pratiche/[id]/page.tsx` — shows DocumentChecklist (showActions="upload"), upload form per document.

- [ ] **Step 6: Verify practice flow end-to-end**

1. Consultant creates practice (select grant + client)
2. Company sees practice with MISSING documents
3. Company uploads a document → status changes to UPLOADED
4. Consultant reviews → APPROVED or REJECTED
5. Progress bar updates

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/actions/practices.ts apps/web/components/document-checklist.tsx \
  apps/web/components/practice-status-badge.tsx \
  apps/web/app/\(dashboard\)/consulente/pratiche/ apps/web/app/\(dashboard\)/azienda/pratiche/
git commit -m "feat: add practice management with dynamic document checklist"
```

---

## Task 10: Document Upload + Review

**Files:**
- Create: `apps/web/lib/actions/documents.ts`
- Create: `apps/web/components/document-upload.tsx`

- [ ] **Step 1: Create document server actions**

```typescript
// apps/web/lib/actions/documents.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";
import { documentReviewSchema } from "@finagevolata/shared";

export async function uploadDocument(practiceDocId: string, formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId || (session?.user as any)?.role !== "COMPANY") {
    return { error: "Non autorizzato" };
  }

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return { error: "File richiesto" };

  // Verify ownership
  const practiceDoc = await prisma.practiceDocument.findUnique({
    where: { id: practiceDocId },
    include: { practice: true, documentType: true },
  });
  if (!practiceDoc || practiceDoc.practice.companyId !== userId) {
    return { error: "Documento non trovato" };
  }

  // Validate format
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!practiceDoc.documentType.acceptedFormats.includes(ext)) {
    return { error: `Formato non accettato. Formati validi: ${practiceDoc.documentType.acceptedFormats.join(", ")}` };
  }

  // Validate size
  const maxBytes = practiceDoc.documentType.maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { error: `File troppo grande. Max: ${practiceDoc.documentType.maxSizeMb}MB` };
  }

  // Upload to Supabase Storage
  const supabase = createServerSupabase();
  const filePath = `practices/${practiceDoc.practiceId}/${practiceDoc.documentType.slug}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    return { error: `Errore upload: ${uploadError.message}` };
  }

  // Calculate expiry
  let expiresAt: Date | null = null;
  if (practiceDoc.documentType.validityDays) {
    expiresAt = new Date(Date.now() + practiceDoc.documentType.validityDays * 86400000);
  }

  // Update record
  await prisma.practiceDocument.update({
    where: { id: practiceDocId },
    data: {
      status: "UPLOADED",
      filePath,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date(),
      expiresAt,
      version: { increment: 1 },
      rejectionReason: null,
    },
  });

  return { success: true };
}

export async function reviewDocument(practiceDocId: string, formData: FormData) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId || (session?.user as any)?.role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  const raw = {
    status: formData.get("status") as string,
    rejectionReason: formData.get("rejectionReason") as string || undefined,
  };

  const parsed = documentReviewSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Verify consultant owns the practice
  const practiceDoc = await prisma.practiceDocument.findUnique({
    where: { id: practiceDocId },
    include: { practice: true },
  });
  if (!practiceDoc || practiceDoc.practice.consultantId !== userId) {
    return { error: "Documento non trovato" };
  }
  if (practiceDoc.status !== "UPLOADED") {
    return { error: "Il documento non è in stato 'Caricato'" };
  }

  await prisma.practiceDocument.update({
    where: { id: practiceDocId },
    data: {
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason || null,
      reviewedAt: new Date(),
      reviewedById: userId,
    },
  });

  return { success: true };
}

export async function getDocumentUrl(practiceDocId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const practiceDoc = await prisma.practiceDocument.findUnique({
    where: { id: practiceDocId },
    include: { practice: true },
  });
  if (!practiceDoc || !practiceDoc.filePath) return { error: "File non trovato" };

  // Access control
  const role = (session?.user as any)?.role;
  if (role === "COMPANY" && practiceDoc.practice.companyId !== userId) return { error: "Non autorizzato" };
  if (role === "CONSULTANT" && practiceDoc.practice.consultantId !== userId) return { error: "Non autorizzato" };

  const supabase = createServerSupabase();
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(practiceDoc.filePath, 300); // 5 min expiry

  if (!data?.signedUrl) return { error: "Errore generazione URL" };

  return { url: data.signedUrl };
}
```

- [ ] **Step 2: Create upload widget component**

```tsx
// apps/web/components/document-upload.tsx
"use client";

import { useState } from "react";
import { uploadDocument } from "@/lib/actions/documents";

export function DocumentUpload({
  practiceDocId,
  acceptedFormats,
  maxSizeMb,
  onSuccess,
}: {
  practiceDocId: string;
  acceptedFormats: string[];
  maxSizeMb: number;
  onSuccess?: () => void;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadDocument(practiceDocId, formData);
    setUploading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess?.();
    }
  }

  const accept = acceptedFormats.map((f) => `.${f}`).join(",");

  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition">
        {uploading ? "Caricamento..." : "Carica documento"}
        <input type="file" className="hidden" accept={accept} onChange={handleUpload} disabled={uploading} />
      </label>
      <p className="mt-1 text-xs text-gray-400">
        Formati: {acceptedFormats.join(", ")} — Max: {maxSizeMb}MB
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create Supabase Storage bucket**

Before testing, create the `documents` bucket in Supabase dashboard (Storage → New bucket → name: "documents", private). Or via CLI:

```bash
# Run once manually or add to setup script
curl -X POST "https://<project-ref>.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"id":"documents","name":"documents","public":false}'
```

- [ ] **Step 4: Verify upload + review flow**

1. Company opens practice → sees MISSING documents → uploads a PDF → status UPLOADED
2. Consultant opens same practice → sees UPLOADED → clicks approve/reject
3. If rejected with reason → company sees reason → re-uploads → version increments

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/actions/documents.ts apps/web/components/document-upload.tsx
git commit -m "feat: add document upload to Supabase Storage and consultant review"
```

---

## Task 11: Notifications

**Files:**
- Create: `apps/web/lib/actions/notifications.ts`
- Create: `apps/web/components/notifications-dropdown.tsx`

- [ ] **Step 1: Create notification server actions**

```typescript
// apps/web/lib/actions/notifications.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  practiceId?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type as any,
      title: data.title,
      message: data.message,
      practiceId: data.practiceId,
    },
  });
}

export async function getNotifications() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return [];

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getUnreadCount() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return 0;

  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(notificationId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  return { success: true };
}

export async function markAllAsRead() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { error: "Non autorizzato" };

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { success: true };
}
```

- [ ] **Step 2: Add notification triggers to document actions**

Update `apps/web/lib/actions/documents.ts`:
- After `uploadDocument` success → call `createNotification` for the consultant: "L'azienda X ha caricato: Visura Camerale"
- After `reviewDocument` with REJECTED → call `createNotification` for the company: "Documento rifiutato: Visura Camerale — motivo: ..."
- After `reviewDocument` with APPROVED → call `createNotification` for the company: "Documento approvato: Visura Camerale"

Import `createNotification` from `./notifications` and add the calls at the end of each action (after the DB update).

- [ ] **Step 3: Create notifications dropdown component**

```tsx
// apps/web/components/notifications-dropdown.tsx
import { getNotifications, getUnreadCount, markAllAsRead } from "@/lib/actions/notifications";

export async function NotificationsDropdown() {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(),
    getUnreadCount(),
  ]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Notifiche</span>
        {unreadCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </div>
      {notifications.length > 0 && (
        <div className="mt-2 space-y-2">
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} className={`rounded-lg border p-3 text-sm ${n.isRead ? "bg-white" : "bg-blue-50 border-blue-200"}`}>
              <p className="font-medium text-gray-900">{n.title}</p>
              <p className="text-gray-500">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString("it-IT")}</p>
            </div>
          ))}
          {unreadCount > 0 && (
            <form action={markAllAsRead}>
              <button type="submit" className="text-xs text-blue-600 hover:underline">
                Segna tutto come letto
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Integrate notifications into dashboard shell**

Add `NotificationsDropdown` to `apps/web/components/dashboard-shell.tsx` in the sidebar or header.

- [ ] **Step 5: Verify notification flow**

1. Company uploads document → consultant sees notification badge
2. Consultant rejects → company sees notification with reason

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/actions/notifications.ts apps/web/components/notifications-dropdown.tsx
git commit -m "feat: add in-app notifications with triggers on document events"
```

---

## Task 12: MouseX Click Day Export

**Files:**
- Create: `apps/web/lib/actions/export.ts`

- [ ] **Step 1: Create export server action**

```typescript
// apps/web/lib/actions/export.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabase } from "@/lib/supabase";

export async function exportForClickDay(practiceId: string) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId || (session?.user as any)?.role !== "CONSULTANT") {
    return { error: "Non autorizzato" };
  }

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    include: {
      grant: true,
      company: { include: { companyProfile: true } },
      documents: { include: { documentType: true } },
    },
  });

  if (!practice || practice.consultantId !== userId) {
    return { error: "Pratica non trovata" };
  }

  if (!practice.grant.hasClickDay) {
    return { error: "Questo bando non prevede Click Day" };
  }

  const allApproved = practice.documents.every((d) => d.status === "APPROVED");
  if (!allApproved) {
    return { error: "Tutti i documenti devono essere approvati prima dell'export" };
  }

  const profile = practice.company.companyProfile;

  // Generate export data
  const exportData = {
    exportDate: new Date().toISOString(),
    practice: {
      id: practice.id,
      status: practice.status,
    },
    grant: {
      title: practice.grant.title,
      issuingBody: practice.grant.issuingBody,
      clickDayDate: practice.grant.clickDayDate?.toISOString() || null,
    },
    company: {
      name: profile?.companyName || practice.company.name,
      vatNumber: profile?.vatNumber || "N/A",
      atecoCode: profile?.atecoCode || "N/A",
      legalForm: profile?.legalForm || "N/A",
      region: profile?.region || "N/A",
      province: profile?.province || "N/A",
    },
    documents: practice.documents.map((d) => ({
      type: d.documentType.name,
      status: d.status,
      fileName: d.fileName,
      filePath: d.filePath,
    })),
  };

  // Update practice status
  await prisma.practice.update({
    where: { id: practiceId },
    data: { clickDayStatus: "REQUESTED" },
  });

  return { success: true, data: exportData };
}
```

- [ ] **Step 2: Add export button to consultant practice detail page**

In `apps/web/app/(dashboard)/consulente/pratiche/[id]/page.tsx`, add a "Richiedi Click Day" button that calls `exportForClickDay`. Show it only when `grant.hasClickDay === true` and all documents are approved. On success, display the JSON data or offer as download, and show updated `clickDayStatus`.

- [ ] **Step 3: Verify export flow**

1. Create a grant with `hasClickDay: true`
2. Create practice, upload and approve all documents
3. Click "Richiedi Click Day" → get export data, practice.clickDayStatus = REQUESTED

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/actions/export.ts
git commit -m "feat: add MouseX Click Day data export"
```

---

## Task 13: Admin User Management

**Files:**
- Create: `apps/web/app/(dashboard)/admin/utenti/page.tsx`

- [ ] **Step 1: Create admin user management page**

```tsx
// apps/web/app/(dashboard)/admin/utenti/page.tsx
import { prisma } from "@/lib/prisma";

export default async function AdminUtentiPage() {
  const users = await prisma.user.findMany({
    include: {
      companyProfile: true,
      consultantProfile: true,
      _count: {
        select: {
          practicesAsConsultant: true,
          practicesAsCompany: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestione Utenti</h1>
      <div className="rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ruolo</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Azienda/Studio</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Pratiche</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Registrato</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b">
                <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    user.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    user.role === "CONSULTANT" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {user.role === "ADMIN" ? "Admin" : user.role === "CONSULTANT" ? "Consulente" : "Azienda"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.companyProfile?.companyName || user.consultantProfile?.firmName || "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {user._count.practicesAsConsultant + user._count.practicesAsCompany}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify admin user management**

Run: `pnpm --filter web dev`
Login as admin → /admin/utenti → see all users with roles and practice counts

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/admin/utenti/
git commit -m "feat: add admin user management page"
```

---

## Task 14: Final Integration + Polish

- [ ] **Step 1: Update CLAUDE.md with actual commands**

Update the CLAUDE.md to reflect the actual project structure and commands now that the codebase exists.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: All shared package tests pass.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Fix any lint errors.

- [ ] **Step 4: Verify complete flow end-to-end**

1. `docker compose up -d` (or Supabase cloud)
2. `pnpm dev`
3. Register admin, consultant, company
4. Company completes onboarding (VAT, ATECO, region)
5. Consultant invites company → company accepts
6. Admin creates grant with document requirements
7. Consultant creates practice for grant + company
8. Company sees checklist, uploads documents
9. Consultant reviews (approve/reject)
10. If grant has Click Day → export to MouseX
11. Notifications appear for all events

- [ ] **Step 5: Commit final polish**

```bash
git add -A
git commit -m "chore: final integration polish and CLAUDE.md update"
```
