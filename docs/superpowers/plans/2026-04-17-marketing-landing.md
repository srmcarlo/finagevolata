# Marketing Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-page public marketing site (+3 legal pages) for FinAgevolata with unified bridge narrative for consultants and companies, routed under a `(marketing)` route group, with Free-plan signup CTA and a working contact form.

**Architecture:** New `(marketing)` route group alongside existing `(auth)` and `(dashboard)`. Server Components for pages, Client Components only where interactive (pricing toggle, FAQ accordion, contact form). Contact via Server Action writing to new `ContactLead` Prisma model + Resend email. Middleware extended so authenticated users visiting `/` get redirected to their dashboard. Tailwind v4 + shadcn/ui + `@base-ui/react` reused; no framer-motion.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui, `@base-ui/react`, Prisma 6, Resend, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-17-marketing-landing-design.md`

---

## File Structure

### New files
- `apps/web/app/(marketing)/layout.tsx` — public header + footer shell
- `apps/web/app/(marketing)/page.tsx` — homepage (bridge narrative)
- `apps/web/app/(marketing)/features/page.tsx` — features detail
- `apps/web/app/(marketing)/prezzi/page.tsx` — pricing with monthly/annual toggle
- `apps/web/app/(marketing)/contatti/page.tsx` — contact form
- `apps/web/app/(marketing)/contatti/actions.ts` — `submitContact` Server Action
- `apps/web/app/(marketing)/contatti/actions.test.ts` — Vitest tests
- `apps/web/app/(marketing)/privacy/page.tsx`
- `apps/web/app/(marketing)/termini/page.tsx`
- `apps/web/app/(marketing)/cookie/page.tsx`
- `apps/web/app/robots.ts`
- `apps/web/app/sitemap.ts`
- `apps/web/app/opengraph-image.tsx`
- `apps/web/components/marketing/logo.tsx`
- `apps/web/components/marketing/marketing-header.tsx`
- `apps/web/components/marketing/marketing-footer.tsx`
- `apps/web/components/marketing/hero-section.tsx`
- `apps/web/components/marketing/feature-card.tsx`
- `apps/web/components/marketing/stat-block.tsx`
- `apps/web/components/marketing/cta-banner.tsx`
- `apps/web/components/marketing/faq-accordion.tsx`
- `apps/web/components/marketing/bridge-diagram.tsx`
- `apps/web/components/marketing/pricing-table.tsx`
- `apps/web/components/marketing/pricing-comparison.tsx`
- `apps/web/components/marketing/contact-form.tsx`
- `apps/web/lib/marketing/plans.ts` — single source of truth for plan metadata
- `packages/db/prisma/migrations/<timestamp>_add_plan_and_contact_lead/migration.sql` (generated)

### Modified files
- `packages/db/prisma/schema.prisma` — add `PlanType`, `ContactLead`, `User.plan`
- `packages/shared/src/schemas/auth.ts` — accept optional `plan`
- `apps/web/app/(auth)/register/page.tsx` — accept `?plan` query param, pass forward
- `apps/web/lib/actions/auth.ts` — persist `plan` on user create
- `apps/web/middleware.ts` — redirect logged-in `/` → dashboard
- `apps/web/app/page.tsx` — (existing server page) leave intact; its redirect logic still runs when middleware does not match, but since the `(marketing)` group owns `/`, this file is superseded. Delete it in Task 3.
- `apps/web/app/layout.tsx` — extend metadata with canonical base
- `turbo.json` — add `CONTACT_EMAIL_TO` to build env list

---

## Task 1: Prisma Schema — PlanType, ContactLead, User.plan

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Generate: `packages/db/prisma/migrations/<timestamp>_add_plan_and_contact_lead/migration.sql`

- [ ] **Step 1: Add enum + model + field to schema**

Edit `packages/db/prisma/schema.prisma`. After the existing `enum NotificationType { ... }` block add:

```prisma
enum PlanType {
  FREE
  PRO_AZIENDA
  CONSULENTE
  STUDIO
}
```

In `model User`, below `role UserRole`, add:

```prisma
  plan          PlanType  @default(FREE)
```

At the end of the file (after `model PracticeActivity`) add:

```prisma
model ContactLead {
  id        String   @id @default(cuid())
  name      String
  email     String
  role      String
  message   String   @db.Text
  plan      String?
  ipHash    String
  createdAt DateTime @default(now())

  @@index([email])
  @@index([createdAt])
  @@index([ipHash, createdAt])
  @@map("contact_leads")
}
```

- [ ] **Step 2: Generate migration**

Run: `pnpm --filter @finagevolata/db prisma migrate dev --name add_plan_and_contact_lead`
Expected: migration file created under `packages/db/prisma/migrations/`, DB updated, client regenerated.

If the local `DATABASE_URL` is unreachable, fall back to:
Run: `pnpm --filter @finagevolata/db prisma migrate diff --from-schema-datamodel packages/db/prisma/schema.prisma --to-schema-datamodel packages/db/prisma/schema.prisma --script > /tmp/check.sql` to verify schema parses, then generate client with `pnpm --filter @finagevolata/db prisma generate` and leave migration creation for Vercel's postinstall + manual `prisma migrate deploy` on the target DB.

- [ ] **Step 3: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations
git commit -m "feat(db): add PlanType enum, User.plan, ContactLead model"
```

---

## Task 2: Turbo env + plan constants

**Files:**
- Modify: `turbo.json`
- Create: `apps/web/lib/marketing/plans.ts`

- [ ] **Step 1: Extend turbo build env allowlist**

Edit `turbo.json`. In the `build.env` array, append `"CONTACT_EMAIL_TO"` after `"GOOGLE_GENERATIVE_AI_API_KEY"`:

```json
"env": [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "CONTACT_EMAIL_TO"
]
```

- [ ] **Step 2: Create single source of truth for plan metadata**

Create `apps/web/lib/marketing/plans.ts`:

```typescript
export type PlanSlug = "free" | "pro-azienda" | "consulente" | "studio";

export type PlanRole = "COMPANY" | "CONSULTANT";

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  role: PlanRole;
  priceMonthly: number;
  priceAnnual: number;
  tagline: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS: readonly PlanDefinition[] = [
  {
    slug: "free",
    name: "Free",
    role: "COMPANY",
    priceMonthly: 0,
    priceAnnual: 0,
    tagline: "Azienda singola che vuole provare",
    features: [
      "1 bando attivo",
      "Upload documenti",
      "Checklist base",
      "Email support",
    ],
  },
  {
    slug: "pro-azienda",
    name: "Pro Azienda",
    role: "COMPANY",
    priceMonthly: 39,
    priceAnnual: 31,
    tagline: "PMI con più bandi attivi",
    features: [
      "Bandi illimitati",
      "Matching bando-azienda",
      "Notifiche scadenze",
      "Storico pratiche",
      "Chat con consulente",
    ],
  },
  {
    slug: "consulente",
    name: "Consulente",
    role: "CONSULTANT",
    priceMonthly: 149,
    priceAnnual: 119,
    tagline: "Freelance o studio fino a 20 clienti",
    highlight: true,
    features: [
      "Fino a 20 clienti",
      "Dashboard multi-cliente",
      "Chat integrata",
      "Checklist dinamica per bando",
      "Click Day MouseX add-on",
    ],
  },
  {
    slug: "studio",
    name: "Studio",
    role: "CONSULTANT",
    priceMonthly: 399,
    priceAnnual: 319,
    tagline: "Studi strutturati, clienti illimitati",
    features: [
      "Clienti illimitati",
      "Team members",
      "White-label",
      "API access",
      "Priority support",
    ],
  },
] as const;

export const PLAN_SLUGS = PLANS.map((p) => p.slug) as readonly PlanSlug[];

export function getPlan(slug: string | null | undefined): PlanDefinition | null {
  if (!slug) return null;
  return PLANS.find((p) => p.slug === slug) ?? null;
}

export function planToPrismaEnum(slug: PlanSlug): "FREE" | "PRO_AZIENDA" | "CONSULENTE" | "STUDIO" {
  return slug.toUpperCase().replace("-", "_") as "FREE" | "PRO_AZIENDA" | "CONSULENTE" | "STUDIO";
}
```

- [ ] **Step 3: Commit**

```bash
git add turbo.json apps/web/lib/marketing/plans.ts
git commit -m "feat(marketing): plan metadata module + turbo env var"
```

---

## Task 3: Route group foundation + remove old redirect home

**Files:**
- Delete: `apps/web/app/page.tsx`
- Create: `apps/web/app/(marketing)/layout.tsx`

- [ ] **Step 1: Remove old home redirect file**

The existing `apps/web/app/page.tsx` server-redirects `/` to dashboards. The new `(marketing)` group will own `/` and the middleware (Task 11) handles the logged-in redirect. Delete it.

Run: `rm apps/web/app/page.tsx`

- [ ] **Step 2: Create marketing layout**

Create `apps/web/app/(marketing)/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://axentraitalia.cloud"),
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 3: Verify build fails because components are missing**

Run: `pnpm --filter @finagevolata/web build`
Expected: type error "Cannot find module '@/components/marketing/marketing-header'". This is the TDD signal — implement components in following tasks.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app
git commit -m "feat(web): scaffold (marketing) route group, drop old home redirect"
```

---

## Task 4: Logo component

**Files:**
- Create: `apps/web/components/marketing/logo.tsx`

- [ ] **Step 1: Create logo wordmark**

Create `apps/web/components/marketing/logo.tsx`:

```tsx
import Link from "next/link";

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-xl font-bold tracking-tight ${className ?? ""}`}
      aria-label="FinAgevolata — home"
    >
      <span className="text-indigo-600">Fin</span>
      <span className="text-slate-900">Agevolata</span>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/marketing/logo.tsx
git commit -m "feat(marketing): wordmark logo placeholder"
```

---

## Task 5: Marketing header + footer

**Files:**
- Create: `apps/web/components/marketing/marketing-header.tsx`
- Create: `apps/web/components/marketing/marketing-footer.tsx`

- [ ] **Step 1: Create header (sticky, mobile menu)**

Create `apps/web/components/marketing/marketing-header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";

const NAV = [
  { href: "/features", label: "Funzionalità" },
  { href: "/prezzi", label: "Prezzi" },
  { href: "/contatti", label: "Contatti" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Accedi
          </Link>
          <Link
            href="/register?plan=free"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Inizia gratis
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden"
          aria-label="Apri menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-3">
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Accedi
              </Link>
              <Link
                href="/register?plan=free"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Inizia gratis
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
```

- [ ] **Step 2: Create footer**

Create `apps/web/components/marketing/marketing-footer.tsx`:

```tsx
import Link from "next/link";
import { Logo } from "./logo";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-slate-600">
              La piattaforma dove consulenti e aziende lavorano insieme sui bandi.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Prodotto</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/features" className="hover:text-slate-900">Funzionalità</Link></li>
              <li><Link href="/prezzi" className="hover:text-slate-900">Prezzi</Link></li>
              <li><Link href="/register?plan=free" className="hover:text-slate-900">Inizia gratis</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Risorse</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/contatti" className="hover:text-slate-900">Contatti</Link></li>
              <li>
                <a href="https://www.mousex.it" target="_blank" rel="noreferrer noopener" className="hover:text-slate-900">
                  Partner MouseX
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/privacy" className="hover:text-slate-900">Privacy</Link></li>
              <li><Link href="/termini" className="hover:text-slate-900">Termini</Link></li>
              <li><Link href="/cookie" className="hover:text-slate-900">Cookie</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center">
          <p className="text-sm text-slate-500">© {year} FinAgevolata. Tutti i diritti riservati.</p>
          <p className="text-sm text-slate-500">
            Click Day powered by{" "}
            <a href="https://www.mousex.it" target="_blank" rel="noreferrer noopener" className="font-semibold text-indigo-600 hover:underline">
              MouseX
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm --filter @finagevolata/web lint`
Expected: no type errors in header/footer/layout/logo.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/marketing
git commit -m "feat(marketing): sticky header + 4-column footer"
```

---

## Task 6: Reusable marketing primitives

**Files:**
- Create: `apps/web/components/marketing/hero-section.tsx`
- Create: `apps/web/components/marketing/feature-card.tsx`
- Create: `apps/web/components/marketing/stat-block.tsx`
- Create: `apps/web/components/marketing/cta-banner.tsx`
- Create: `apps/web/components/marketing/bridge-diagram.tsx`
- Create: `apps/web/components/marketing/faq-accordion.tsx`

- [ ] **Step 1: Hero section wrapper**

Create `apps/web/components/marketing/hero-section.tsx`:

```tsx
import { ReactNode } from "react";

interface HeroSectionProps {
  children: ReactNode;
  visual?: ReactNode;
}

export function HeroSection({ children, visual }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">{children}</div>
        {visual ? <div className="flex items-center justify-center">{visual}</div> : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Feature card**

Create `apps/web/components/marketing/feature-card.tsx`:

```tsx
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
        <Icon className="size-5" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
```

- [ ] **Step 3: Stat block**

Create `apps/web/components/marketing/stat-block.tsx`:

```tsx
interface StatBlockProps {
  value: string;
  label: string;
  source?: string;
}

export function StatBlock({ value, label, source }: StatBlockProps) {
  return (
    <div className="text-center">
      <div className="text-5xl font-bold tracking-tight text-indigo-600 md:text-6xl">{value}</div>
      <div className="mt-3 text-base font-medium text-slate-900">{label}</div>
      {source ? <div className="mt-1 text-xs text-slate-500">Fonte: {source}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: CTA banner**

Create `apps/web/components/marketing/cta-banner.tsx`:

```tsx
import Link from "next/link";

interface CtaBannerProps {
  title: string;
  subtitle?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CtaBanner({
  title,
  subtitle,
  primaryHref = "/register?plan=free",
  primaryLabel = "Inizia gratis",
  secondaryHref = "/contatti",
  secondaryLabel = "Parla con noi",
}: CtaBannerProps) {
  return (
    <section className="bg-slate-900 py-16">
      <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-4 text-lg text-slate-300">{subtitle}</p> : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryHref}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Bridge diagram (SVG)**

Create `apps/web/components/marketing/bridge-diagram.tsx`:

```tsx
export function BridgeDiagram() {
  return (
    <svg
      viewBox="0 0 480 320"
      className="w-full max-w-md"
      role="img"
      aria-label="Ponte tra consulente e azienda tramite FinAgevolata"
    >
      <defs>
        <linearGradient id="bridgeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      <rect x="20" y="100" width="140" height="120" rx="14" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
      <text x="90" y="155" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="16" fill="#312E81">Consulente</text>
      <text x="90" y="180" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#4F46E5">Dashboard clienti</text>

      <rect x="320" y="100" width="140" height="120" rx="14" fill="#ECFDF5" stroke="#10B981" strokeWidth="2" />
      <text x="390" y="155" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="16" fill="#065F46">Azienda</text>
      <text x="390" y="180" textAnchor="middle" fontFamily="Inter" fontSize="12" fill="#047857">Documenti + stato</text>

      <path d="M 160 160 C 220 120, 260 120, 320 160" stroke="url(#bridgeGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 160 160 C 220 200, 260 200, 320 160" stroke="url(#bridgeGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />

      <circle cx="240" cy="140" r="6" fill="#6366F1" />
      <circle cx="240" cy="180" r="6" fill="#10B981" />

      <rect x="205" y="40" width="70" height="40" rx="8" fill="#0F172A" />
      <text x="240" y="65" textAnchor="middle" fontFamily="Inter" fontWeight="700" fontSize="14" fill="white">FinAgevolata</text>
      <path d="M 240 80 L 240 130" stroke="#0F172A" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
  );
}
```

- [ ] **Step 6: FAQ accordion (Base UI Disclosure)**

Create `apps/web/components/marketing/faq-accordion.tsx`:

```tsx
"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordion.Root className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {items.map((item, i) => (
        <Accordion.Item key={i} className="group">
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-base font-semibold text-slate-900 transition hover:bg-slate-50">
              <span>{item.question}</span>
              <ChevronDown className="size-5 shrink-0 text-slate-500 transition group-data-[panel-open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="px-6 pb-4 text-sm leading-relaxed text-slate-600">
            {item.answer}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
```

- [ ] **Step 7: Verify lint / typecheck**

Run: `pnpm --filter @finagevolata/web lint`
Expected: clean.

If `@base-ui/react/accordion` path differs in the installed version, adjust import to match `packages/shared` usage elsewhere (grep for existing `@base-ui/react` imports).

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/marketing
git commit -m "feat(marketing): reusable hero/card/stat/cta/diagram/faq primitives"
```

---

## Task 7: Homepage

**Files:**
- Create: `apps/web/app/(marketing)/page.tsx`

- [ ] **Step 1: Build homepage composing primitives**

Create `apps/web/app/(marketing)/page.tsx`:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardCheck,
  ShieldCheck,
  Users,
  Target,
  Zap,
  Sparkles,
} from "lucide-react";
import { HeroSection } from "@/components/marketing/hero-section";
import { BridgeDiagram } from "@/components/marketing/bridge-diagram";
import { StatBlock } from "@/components/marketing/stat-block";
import { FeatureCard } from "@/components/marketing/feature-card";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export const metadata: Metadata = {
  title: "FinAgevolata — Piattaforma bandi per consulenti e aziende",
  description:
    "Gestisci bandi, documenti e Click Day in un'unica piattaforma. Consulenti e aziende lavorano insieme. Prova gratis.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: ClipboardCheck, title: "Checklist dinamica per bando", description: "Il sistema sa esattamente quali documenti servono per ogni bando e il loro stato per ogni azienda." },
  { icon: ShieldCheck, title: "Validazione proattiva", description: "Alert automatici su DURC scaduto, visure vecchie, bilanci mancanti. Prima della deadline." },
  { icon: Users, title: "Ponte bidirezionale", description: "Consulente e azienda lavorano nello stesso workspace. Niente più email perse." },
  { icon: Target, title: "Matching bando ↔ azienda", description: "Settore ATECO, dimensione, territorio. Ricevi solo i bandi che ti riguardano." },
  { icon: Zap, title: "Click Day integrato", description: "Partner MouseX nativo per bandi INAIL, Sabatini, Transizione 4.0." },
  { icon: Sparkles, title: "Onboarding automatico", description: "Inserisci P.IVA → dati CCIAA, codice ATECO e profilo azienda compilati in automatico." },
];

const FAQ = [
  { question: "Quanto costa FinAgevolata?", answer: <>Parti gratis, passa a un piano pagato solo quando serve. <Link href="/prezzi" className="font-semibold text-indigo-600 hover:underline">Vedi i prezzi</Link>.</> },
  { question: "Posso invitare i miei clienti o il mio consulente?", answer: "Sì. Un consulente gestisce più aziende, un'azienda può condividere il workspace col proprio consulente. L'invito avviene via email dal portale." },
  { question: "Come funziona l'integrazione Click Day con MouseX?", answer: "Quando una pratica è pronta, esporti i dati al partner MouseX con un click. MouseX gestisce la velocità di invio nel giorno dell'apertura del bando." },
  { question: "I miei dati sono sicuri?", answer: "Documenti cifrati a riposo, accesso solo via URL firmati a scadenza breve, row-level security sul database. GDPR compliant." },
  { question: "Posso cancellare l'account?", answer: "Sì, in qualsiasi momento dal portale. I tuoi documenti vengono eliminati secondo la nostra data retention policy." },
];

export default function HomePage() {
  return (
    <>
      <HeroSection visual={<BridgeDiagram />}>
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
          La piattaforma dove consulenti e aziende lavorano <span className="text-indigo-600">insieme</span> sui bandi.
        </h1>
        <p className="mt-6 text-lg text-slate-600 md:text-xl">
          Finanza agevolata senza Excel, senza email perse, senza documenti in ritardo.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register?plan=free"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Inizia gratis <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#come-funziona"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Vedi come funziona
          </Link>
        </div>
      </HeroSection>

      <section className="border-b border-slate-200 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-indigo-600">Il problema</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Il 70% delle domande viene respinto per documenti sbagliati.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            <StatBlock value="70%" label="domande respinte per documenti incompleti o non conformi" />
            <StatBlock value="15-20 min" label="tempo medio di esaurimento fondi al Click Day" />
            <StatBlock value="300k€" label="soglia aiuti de minimis su 3 anni" source="Reg. UE 2023/2831" />
          </div>
        </div>
      </section>

      <section id="come-funziona" className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Come funziona</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Tre passi dal primo contatto all'invio della domanda.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", title: "Collega consulente e azienda", desc: "Workspace condiviso creato in 30 secondi. Ognuno accede solo a ciò che gli serve." },
              { n: "2", title: "Checklist dinamica per bando", desc: "Il sistema dice cosa serve, entro quando. L'azienda carica, il consulente valida." },
              { n: "3", title: "Invio assistito, incluso Click Day", desc: "Pratica pronta → export MouseX. Velocità garantita nei Click Day critici." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{s.n}</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Tutto in un solo posto</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Sei funzionalità costruite per la finanza agevolata italiana.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/features" className="text-sm font-semibold text-indigo-600 hover:underline">
              Scopri tutte le funzionalità →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900">Sei un consulente?</h3>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Dashboard multi-cliente, N aziende, una sola vista</li>
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Meno email, più pratiche chiuse</li>
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Click Day integrato con partner MouseX</li>
                <li className="flex gap-3"><span className="text-indigo-600">✓</span> Compliance automatica su documenti e scadenze</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900">Sei un'azienda?</h3>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Sai esattamente quale documento serve, quando</li>
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Non perdi più nessuna scadenza</li>
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Lavori nello stesso spazio del tuo consulente</li>
                <li className="flex gap-3"><span className="text-emerald-600">✓</span> Massimizzi la probabilità di successo</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/register?plan=free"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Prova gratis
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" />
            Integrato con{" "}
            <a href="https://www.mousex.it" target="_blank" rel="noreferrer noopener" className="font-semibold text-indigo-600 hover:underline">
              MouseX
            </a>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600">
            MouseX è il partner Click Day di riferimento per i bandi più competitivi d'Italia:
            INAIL ISI, Sabatini, Transizione 4.0. Quando conta la velocità, conta l'integrazione.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Domande frequenti</h2>
          <div className="mt-10">
            <FaqAccordion items={FAQ} />
          </div>
        </div>
      </section>

      <CtaBanner title="Pronto a semplificare la gestione bandi?" subtitle="Inizia con il piano Free. Niente carta di credito, nessun commitment." />
    </>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `pnpm --filter @finagevolata/web dev`
Open `http://localhost:3000/`. Expected: homepage renders without runtime errors, all sections visible, CTAs point to `/register?plan=free`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(marketing\)/page.tsx
git commit -m "feat(marketing): homepage with bridge narrative"
```

---

## Task 8: Features page

**Files:**
- Create: `apps/web/app/(marketing)/features/page.tsx`

- [ ] **Step 1: Build features page**

Create `apps/web/app/(marketing)/features/page.tsx`:

```tsx
import type { Metadata } from "next";
import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = {
  title: "Funzionalità — FinAgevolata",
  description:
    "Checklist dinamica, validazione proattiva, Click Day MouseX, matching bando-azienda. Scopri tutte le features.",
  alternates: { canonical: "/features" },
};

const SECTIONS = [
  {
    id: "checklist-dinamica",
    title: "Checklist dinamica per bando",
    body: "Ogni bando ha requisiti diversi. FinAgevolata genera automaticamente la lista dei documenti necessari a partire dal bando selezionato, segnala lo stato di ognuno (mancante / caricato / in revisione / approvato / rifiutato) e calcola le scadenze (DURC 120 giorni, visura camerale 6 mesi, ecc.).",
    bullets: ["Genera checklist a partire dal bando", "Stato documento tracciato in tempo reale", "Scadenze calcolate automaticamente", "Promemoria a 30/15/7 giorni"],
  },
  {
    id: "validazione-proattiva",
    title: "Validazione documenti proattiva",
    body: "Il sistema controlla formati, dimensioni e validità dei documenti caricati. Se un DURC sta per scadere o un bilancio è del 2023 quando ne serve uno del 2024, ti avvisa prima che sia un problema. Niente più sorprese nella fase finale della domanda.",
    bullets: ["Check automatico formato e dimensione", "Alert su documenti in scadenza", "Versioning: storico delle versioni caricate", "Flag su bilanci / visure obsoleti"],
  },
  {
    id: "ponte-bidirezionale",
    title: "Ponte bidirezionale consulente ⇄ azienda",
    body: "A differenza delle altre piattaforme, qui sia il consulente che l'azienda hanno un portale con permessi chiari: l'azienda carica, il consulente valida e compila. Tutto nello stesso workspace, con chat integrata per pratica.",
    bullets: ["Un workspace per pratica", "Chat contestuale", "Permessi row-level: ognuno vede solo ciò che gli compete", "Audit log completo"],
  },
  {
    id: "matching",
    title: "Matching bando ↔ profilo azienda",
    body: "Basato su settore ATECO, dimensione aziendale, localizzazione e requisiti specifici. Il consulente riceve suggerimenti sui bandi attivabili per ogni cliente. L'azienda in piano Free vede i 3-5 bandi più rilevanti per il proprio profilo.",
    bullets: ["Filtraggio per ATECO e regione", "Dimensione azienda (micro / small / medium / large)", "Requisiti specifici (de minimis, antimafia, ecc.)", "Scoring predittivo (Fase 2)"],
  },
  {
    id: "click-day",
    title: "Integrazione Click Day con MouseX",
    body: "Quando una pratica è pronta, un click esporta i dati al partner MouseX, che garantisce velocità di invio nel giorno dell'apertura del bando. Unico nel mercato: nessun altro SaaS italiano offre questa integrazione nativa.",
    bullets: ["Export one-click verso MouseX", "Tracking stato Click Day: inviato / in graduatoria / esito", "Specializzato su bandi INAIL, Sabatini, Transizione 4.0", "Niente workaround manuali"],
  },
  {
    id: "onboarding-piva",
    title: "Onboarding automatico da P.IVA",
    body: "L'azienda inserisce la Partita IVA: FinAgevolata recupera in automatico ragione sociale, codice ATECO con descrizione, forma legale e provincia dai dati CCIAA. Onboarding in meno di 60 secondi.",
    bullets: ["Auto-compilazione da P.IVA", "Dati camerali aggiornati", "Codice ATECO + descrizione", "Form minimale: resta da scegliere solo la dimensione e l'email"],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Tutto quello che serve per chiudere la pratica.
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Sei funzionalità chiave. Costruite per la finanza agevolata italiana, non adattate da altri mercati.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        {SECTIONS.map((s, i) => (
          <section key={s.id} id={s.id} className={`${i === 0 ? "" : "mt-20"} scroll-mt-24`}>
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Funzionalità {i + 1}</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{s.title}</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{s.body}</p>
            <ul className="mt-6 grid gap-2 md:grid-cols-2">
              {s.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-indigo-600">✓</span> {b}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <CtaBanner title="Prova tutte le funzionalità gratis" subtitle="Piano Free senza carta di credito. Upgrade quando ti serve." />
    </>
  );
}
```

- [ ] **Step 2: Verify page renders**

Run: `pnpm --filter @finagevolata/web dev`
Open `http://localhost:3000/features`. Expected: 6 feature sections, anchor navigation works.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(marketing\)/features
git commit -m "feat(marketing): /features page with 6 feature deep-dives"
```

---

## Task 9: Pricing table + comparison components

**Files:**
- Create: `apps/web/components/marketing/pricing-table.tsx`
- Create: `apps/web/components/marketing/pricing-comparison.tsx`

- [ ] **Step 1: Pricing table client component with toggle**

Create `apps/web/components/marketing/pricing-table.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/marketing/plans";

type Billing = "monthly" | "annual";

export function PricingTable() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <>
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${billing === "monthly" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            Mensile
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${billing === "annual" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            Annuale <span className="ml-1 text-xs opacity-80">-20%</span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.priceMonthly : plan.priceAnnual;
          return (
            <div
              key={plan.slug}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${plan.highlight ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"}`}
            >
              {plan.highlight ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Più scelto
                </div>
              ) : null}
              <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold tracking-tight text-slate-900">{price === 0 ? "0€" : `${price}€`}</span>
                {price > 0 ? <span className="text-sm text-slate-500">/mese</span> : null}
                {billing === "annual" && price > 0 ? (
                  <div className="mt-1 text-xs text-emerald-600">Fatturato annualmente</div>
                ) : null}
              </div>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="size-4 shrink-0 text-indigo-600" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/register?plan=${plan.slug}`}
                className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${plan.highlight ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"}`}
              >
                Inizia gratis
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Pricing comparison table**

Create `apps/web/components/marketing/pricing-comparison.tsx`:

```tsx
import { Check, X } from "lucide-react";

type Row = { label: string; values: (string | boolean)[] };

const ROWS: Row[] = [
  { label: "Bandi attivi", values: ["1", "Illimitati", "Per cliente", "Per cliente"] },
  { label: "Clienti gestibili", values: [false, false, "Fino a 20", "Illimitati"] },
  { label: "Team members", values: ["1", "1", "1", "Illimitati"] },
  { label: "Click Day add-on", values: [false, true, true, true] },
  { label: "White-label", values: [false, false, false, true] },
  { label: "API access", values: [false, false, false, true] },
  { label: "Storage documenti", values: ["1 GB", "10 GB", "50 GB", "Illimitato"] },
  { label: "Support", values: ["Email", "Email", "Email + Chat", "Priority"] },
];

const HEADERS = ["Free", "Pro Azienda", "Consulente", "Studio"];

export function PricingComparison() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900">
              Confronto piani
            </th>
            {HEADERS.map((h) => (
              <th key={h} className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, idx) => (
            <tr key={row.label} className={idx % 2 === 0 ? "bg-slate-50" : "bg-white"}>
              <td className="sticky left-0 bg-inherit px-4 py-3 text-sm font-medium text-slate-700">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="px-4 py-3 text-center text-sm text-slate-700">
                  {v === true ? (
                    <Check className="mx-auto size-4 text-indigo-600" />
                  ) : v === false ? (
                    <X className="mx-auto size-4 text-slate-300" />
                  ) : (
                    v
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/marketing
git commit -m "feat(marketing): pricing table with toggle + comparison"
```

---

## Task 10: Pricing page

**Files:**
- Create: `apps/web/app/(marketing)/prezzi/page.tsx`

- [ ] **Step 1: Build pricing page**

Create `apps/web/app/(marketing)/prezzi/page.tsx`:

```tsx
import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/pricing-table";
import { PricingComparison } from "@/components/marketing/pricing-comparison";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = {
  title: "Prezzi — FinAgevolata",
  description: "Piani da 0€ (Free) a 399€/mese (Studio). Senza commitment. Inizia gratis ora.",
  alternates: { canonical: "/prezzi" },
};

const FAQ = [
  { question: "Come avviene la fatturazione?", answer: "Fattura elettronica mensile o annuale. IVA 22% esclusa dai prezzi mostrati, aggiunta in fattura." },
  { question: "Posso cambiare piano in qualsiasi momento?", answer: "Sì. Upgrade: attivo subito, pro-rata sul ciclo corrente. Downgrade: attivo dal ciclo successivo." },
  { question: "Come disdico l'abbonamento?", answer: "Dal portale, sezione Impostazioni → Fatturazione. Nessun commitment, nessuna penale." },
  { question: "C'è un periodo di prova a pagamento?", answer: "No, il piano Free è gratuito per sempre (con limiti). Puoi provare la piattaforma senza carta di credito." },
];

export default function PrezziPage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Un piano per ogni dimensione.</h1>
          <p className="mt-6 text-lg text-slate-600">
            Parti gratis. Paghi solo quando cresci. Nessun commitment annuale.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <PricingTable />
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Confronto completo</h2>
          <div className="mt-10">
            <PricingComparison />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Domande frequenti</h2>
          <div className="mt-10">
            <FaqAccordion items={FAQ} />
          </div>
        </div>
      </section>

      <CtaBanner title="Inizia oggi. Gratis." subtitle="Passa a un piano pagato solo quando ti serve." />
    </>
  );
}
```

- [ ] **Step 2: Verify pricing page + toggle works**

Run: `pnpm --filter @finagevolata/web dev`
Open `http://localhost:3000/prezzi`. Click Mensile ↔ Annuale. Expected: prices update (Consulente 149€ ↔ 119€). "Più scelto" badge on Consulente. CTAs carry correct `?plan=<slug>`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(marketing\)/prezzi
git commit -m "feat(marketing): /prezzi page with 4-plan table + comparison"
```

---

## Task 11: Contact form server action (TDD)

**Files:**
- Create: `apps/web/app/(marketing)/contatti/actions.ts`
- Create: `apps/web/app/(marketing)/contatti/actions.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `apps/web/app/(marketing)/contatti/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contactLead: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", "1.2.3.4"]]),
}));

import { submitContact } from "./actions";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

describe("submitContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid email", async () => {
    await expect(
      submitContact({ name: "Mario", email: "not-an-email", role: "azienda", message: "Ciao devo fare domanda per un bando." }),
    ).rejects.toThrow();
  });

  it("rejects short message", async () => {
    await expect(
      submitContact({ name: "Mario", email: "m@x.it", role: "azienda", message: "Ciao" }),
    ).rejects.toThrow();
  });

  it("rejects unknown role", async () => {
    await expect(
      submitContact({ name: "Mario", email: "m@x.it", role: "hacker", message: "Ciao dovrei parlare con voi." }),
    ).rejects.toThrow();
  });

  it("blocks second submit from same IP within 60s (rate limit)", async () => {
    (prisma.contactLead.findFirst as any).mockResolvedValueOnce({ id: "x" });
    await expect(
      submitContact({ name: "Mario", email: "m@x.it", role: "azienda", message: "Ciao dovrei parlare con voi di un bando." }),
    ).rejects.toThrow(/tentativi/i);
    expect(prisma.contactLead.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("saves lead and sends email on valid input", async () => {
    (prisma.contactLead.findFirst as any).mockResolvedValueOnce(null);
    (prisma.contactLead.create as any).mockResolvedValueOnce({ id: "lead1" });

    const result = await submitContact({
      name: "Mario Rossi",
      email: "mario@example.it",
      role: "consulente",
      message: "Vorrei capire come funziona il piano consulente.",
      plan: "consulente",
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.contactLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Mario Rossi",
          email: "mario@example.it",
          role: "consulente",
          plan: "consulente",
          ipHash: expect.any(String),
        }),
      }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Mario Rossi"),
      }),
    );
  });

  it("hashes IP deterministically (same IP → same hash)", async () => {
    (prisma.contactLead.findFirst as any).mockResolvedValue(null);
    (prisma.contactLead.create as any).mockResolvedValue({ id: "x" });

    await submitContact({ name: "A", email: "a@a.it", role: "azienda", message: "Messaggio lungo abbastanza." });
    const firstHash = (prisma.contactLead.create as any).mock.calls[0][0].data.ipHash;

    await submitContact({ name: "B", email: "b@b.it", role: "azienda", message: "Altro messaggio abbastanza lungo." });
    const secondHash = (prisma.contactLead.create as any).mock.calls[1][0].data.ipHash;

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toHaveLength(64);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `pnpm --filter @finagevolata/web test -- apps/web/app/\\(marketing\\)/contatti/actions.test.ts`
Expected: FAIL (module `./actions` not found).

- [ ] **Step 3: Implement action**

Create `apps/web/app/(marketing)/contatti/actions.ts`:

```typescript
"use server";

import { z } from "zod";
import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const ContactSchema = z.object({
  name: z.string().min(2, "Nome troppo corto").max(100),
  email: z.string().email("Email non valida"),
  role: z.enum(["consulente", "azienda", "altro"], {
    errorMap: () => ({ message: "Ruolo non valido" }),
  }),
  message: z.string().min(10, "Messaggio troppo corto").max(2000),
  plan: z.string().optional(),
});

export type ContactInput = z.infer<typeof ContactSchema>;

export async function submitContact(input: unknown): Promise<{ ok: true }> {
  const parsed = ContactSchema.parse(input);

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

  const recent = await prisma.contactLead.findFirst({
    where: {
      ipHash,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recent) {
    throw new Error("Troppi tentativi. Riprova tra un minuto.");
  }

  await prisma.contactLead.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      message: parsed.message,
      plan: parsed.plan ?? null,
      ipHash,
    },
  });

  await sendEmail({
    to: process.env.CONTACT_EMAIL_TO ?? "axentra.italia@gmail.com",
    subject: `[Contact] ${parsed.name} (${parsed.role})`,
    text: `Nuovo contatto dal sito FinAgevolata.

Nome: ${parsed.name}
Email: ${parsed.email}
Ruolo: ${parsed.role}
Piano di interesse: ${parsed.plan ?? "-"}

Messaggio:
${parsed.message}
`,
  });

  return { ok: true };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm --filter @finagevolata/web test -- apps/web/app/\\(marketing\\)/contatti/actions.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(marketing\)/contatti
git commit -m "feat(marketing): submitContact server action with rate limit + tests"
```

---

## Task 12: Contact form client component + page

**Files:**
- Create: `apps/web/components/marketing/contact-form.tsx`
- Create: `apps/web/app/(marketing)/contatti/page.tsx`

- [ ] **Step 1: Client form component**

Create `apps/web/components/marketing/contact-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { submitContact } from "@/app/(marketing)/contatti/actions";

interface ContactFormProps {
  defaultPlan?: string;
}

export function ContactForm({ defaultPlan }: ContactFormProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    setStatus("idle");
    setErrorMsg("");
    startTransition(async () => {
      try {
        await submitContact({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          role: String(formData.get("role") ?? ""),
          message: String(formData.get("message") ?? ""),
          plan: (formData.get("plan") as string) || undefined,
        });
        setStatus("ok");
      } catch (err: unknown) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Errore sconosciuto");
      }
    });
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h3 className="text-xl font-bold text-emerald-900">Grazie!</h3>
        <p className="mt-2 text-sm text-emerald-800">
          Messaggio ricevuto. Ti rispondiamo entro 1 giorno lavorativo.
        </p>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      {defaultPlan ? <input type="hidden" name="plan" value={defaultPlan} /> : null}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Nome e cognome</label>
        <input
          id="name" name="name" type="text" required minLength={2} maxLength={100}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          id="email" name="email" type="email" required
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">Sono un...</label>
        <select
          id="role" name="role" required defaultValue=""
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="" disabled>Seleziona...</option>
          <option value="consulente">Consulente di finanza agevolata</option>
          <option value="azienda">Azienda / PMI</option>
          <option value="altro">Altro</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Messaggio</label>
        <textarea
          id="message" name="message" required minLength={10} maxLength={2000} rows={5}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {status === "error" ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg || "Errore nell'invio. Riprova."}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Invio in corso..." : "Invia messaggio"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Contact page**

Create `apps/web/app/(marketing)/contatti/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contatti — FinAgevolata",
  description: "Parla con il team. Demo personalizzata per consulenti e aziende.",
  alternates: { canonical: "/contatti" },
};

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function ContattiPage({ searchParams }: PageProps) {
  const { plan } = await searchParams;

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Parla con noi.</h1>
          <p className="mt-6 text-lg text-slate-600">
            Scrivi per una demo, domande tecniche o qualsiasi altra richiesta. Rispondiamo entro un giorno lavorativo.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 lg:grid-cols-5 lg:px-8">
          <div className="lg:col-span-3">
            <ContactForm defaultPlan={plan} />
          </div>

          <aside className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Altri canali</h2>
            <ul className="mt-4 space-y-4 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-indigo-600" />
                <div>
                  <div className="font-medium">Email</div>
                  <a href="mailto:axentra.italia@gmail.com" className="text-indigo-600 hover:underline">
                    axentra.italia@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 size-4 text-emerald-600" />
                <div>
                  <div className="font-medium">WhatsApp</div>
                  <a
                    href="https://api.whatsapp.com/send/?phone=393459938680"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-indigo-600 hover:underline"
                  >
                    +39 345 993 8680
                  </a>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Run: `pnpm --filter @finagevolata/web dev`
Open `http://localhost:3000/contatti?plan=consulente`. Fill form, submit. Expected: success state shown; DB has a new `ContactLead`; a second submission within 60s shows rate-limit error.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/marketing/contact-form.tsx apps/web/app/\(marketing\)/contatti/page.tsx
git commit -m "feat(marketing): /contatti form + aside contacts"
```

---

## Task 13: Legal pages

**Files:**
- Create: `apps/web/app/(marketing)/privacy/page.tsx`
- Create: `apps/web/app/(marketing)/termini/page.tsx`
- Create: `apps/web/app/(marketing)/cookie/page.tsx`

- [ ] **Step 1: Privacy page**

Create `apps/web/app/(marketing)/privacy/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — FinAgevolata",
  description: "Informativa sulla privacy e trattamento dei dati personali.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      {/* TODO: legal review prima del go-live */}
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <h2>Titolare del trattamento</h2>
        <p>FinAgevolata (di seguito &quot;noi&quot;) tratta i tuoi dati personali nel rispetto del Regolamento UE 2016/679 (GDPR).</p>

        <h2>Dati raccolti</h2>
        <ul>
          <li>Dati account: nome, email, ruolo (consulente / azienda)</li>
          <li>Dati aziendali: P.IVA, ragione sociale, codice ATECO, regione</li>
          <li>Documenti caricati per pratiche di finanza agevolata</li>
          <li>Log tecnici (IP, user agent) per sicurezza e anti-abuso</li>
        </ul>

        <h2>Finalità del trattamento</h2>
        <ul>
          <li>Fornire il servizio di gestione bandi e documenti</li>
          <li>Comunicare scadenze e aggiornamenti via email</li>
          <li>Rispettare obblighi di legge</li>
        </ul>

        <h2>Conservazione</h2>
        <p>I dati sono conservati per la durata del rapporto contrattuale. I documenti di pratiche chiuse sono conservati per i termini previsti dai bandi (tipicamente 10 anni).</p>

        <h2>Diritti dell&apos;interessato</h2>
        <p>Hai diritto di accesso, rettifica, cancellazione, limitazione e portabilità. Scrivi a <a href="mailto:axentra.italia@gmail.com">axentra.italia@gmail.com</a> per esercitarli.</p>

        <h2>Sicurezza</h2>
        <p>Documenti cifrati a riposo e in transito, accesso ristretto via URL firmati, row-level security sul database.</p>

        <p className="text-sm text-slate-500"><em>Testo soggetto a revisione legale prima del go-live.</em></p>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Termini page**

Create `apps/web/app/(marketing)/termini/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termini di servizio — FinAgevolata",
  description: "Termini e condizioni d'uso della piattaforma.",
  alternates: { canonical: "/termini" },
};

export default function TerminiPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      {/* TODO: legal review prima del go-live */}
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Termini di servizio</h1>
      <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <h2>1. Oggetto</h2>
        <p>FinAgevolata è un servizio SaaS per la gestione di pratiche di finanza agevolata, destinato a consulenti e imprese italiane.</p>

        <h2>2. Registrazione</h2>
        <p>L&apos;uso del servizio richiede registrazione. Garantisci la veridicità dei dati inseriti.</p>

        <h2>3. Piani e fatturazione</h2>
        <p>I piani a pagamento sono fatturati mensilmente o annualmente. Nessun commitment a lungo termine. Disdetta dal portale in qualsiasi momento.</p>

        <h2>4. Limitazioni di responsabilità</h2>
        <p>FinAgevolata è uno strumento di gestione. La responsabilità per la correttezza dei dati inseriti e la conformità della pratica al bando resta dell&apos;utente e del suo consulente.</p>

        <h2>5. Click Day</h2>
        <p>L&apos;integrazione Click Day è fornita dal partner MouseX. L&apos;esito della procedura Click Day dipende da fattori (disponibilità fondi, ordine cronologico) non controllabili da FinAgevolata.</p>

        <h2>6. Modifiche ai termini</h2>
        <p>Ci riserviamo la facoltà di modificare questi termini con preavviso email di almeno 30 giorni.</p>

        <h2>7. Legge applicabile</h2>
        <p>Legge italiana. Foro competente: Roma.</p>

        <p className="text-sm text-slate-500"><em>Testo soggetto a revisione legale prima del go-live.</em></p>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Cookie page**

Create `apps/web/app/(marketing)/cookie/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — FinAgevolata",
  description: "Policy sui cookie utilizzati dalla piattaforma.",
  alternates: { canonical: "/cookie" },
};

export default function CookiePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      {/* TODO: legal review prima del go-live */}
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Cookie Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <h2>Cookie utilizzati</h2>
        <p>Il sito utilizza esclusivamente cookie tecnici essenziali per il funzionamento del servizio:</p>
        <ul>
          <li><strong>Cookie di sessione autenticazione</strong> (next-auth) — indispensabili per l&apos;accesso al portale. Scadenza: 30 giorni.</li>
          <li><strong>Cookie CSRF</strong> — protezione contro attacchi cross-site. Scadenza: sessione.</li>
        </ul>

        <h2>Cookie analytics e marketing</h2>
        <p>Al momento <strong>non utilizziamo</strong> cookie di analytics né di marketing. Se in futuro introdurremo tracking non essenziale, aggiorneremo questa policy e mostreremo un banner di consenso.</p>

        <h2>Gestione cookie</h2>
        <p>Essendo solo cookie tecnici strettamente necessari, non è richiesto consenso. Puoi comunque bloccarli dalle impostazioni del browser; in tal caso, il servizio non sarà utilizzabile.</p>

        <p className="text-sm text-slate-500"><em>Testo soggetto a revisione legale prima del go-live.</em></p>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(marketing\)/privacy apps/web/app/\(marketing\)/termini apps/web/app/\(marketing\)/cookie
git commit -m "feat(marketing): legal pages (privacy, termini, cookie) templates"
```

---

## Task 14: Middleware update (redirect logged-in from /)

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Add public path allowlist + redirect logic**

Replace the content of `apps/web/middleware.ts` with:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/features", "/prezzi", "/contatti", "/privacy", "/termini", "/cookie"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isDashboard =
    pathname.startsWith("/consulente") ||
    pathname.startsWith("/azienda") ||
    pathname.startsWith("/admin");
  const isPublicMarketing = PUBLIC_PATHS.has(pathname);

  // Logged-in users on marketing homepage "/" → redirect to dashboard
  if (pathname === "/" && isLoggedIn) {
    const redirect =
      role === "CONSULTANT" ? "/consulente" :
      role === "ADMIN" ? "/admin" :
      role === "COMPANY" ? "/azienda" :
      "/login";
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  // Logged-in users on auth pages → redirect to dashboard
  if (isAuthPage && isLoggedIn) {
    const redirect =
      role === "CONSULTANT" ? "/consulente" :
      role === "COMPANY" ? "/azienda" :
      role === "ADMIN" ? "/admin" : "/";
    return NextResponse.redirect(new URL(redirect, req.url));
  }

  // Allow logged-in COMPANY users to access onboarding
  if (isOnboarding && isLoggedIn && role === "COMPANY") {
    return NextResponse.next();
  }

  // Redirect non-COMPANY or non-logged-in users away from onboarding
  if (isOnboarding && (!isLoggedIn || role !== "COMPANY")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Dashboard requires login
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based route protection
  if (isLoggedIn && isDashboard) {
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

  // Public marketing paths: always allow
  if (isPublicMarketing) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|sitemap.xml|robots.txt).*)"],
};
```

- [ ] **Step 2: Verify manually**

Run: `pnpm --filter @finagevolata/web dev`
1. Anonymous: `/` → homepage visible. `/consulente` → redirect to `/login`.
2. Log in as COMPANY → visit `/` → redirect to `/azienda`.
3. Log in as CONSULTANT → visit `/` → redirect to `/consulente`.
4. Log out, visit `/features`, `/prezzi`, `/contatti` → all accessible.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): middleware redirects logged-in / to dashboard, allows marketing paths"
```

---

## Task 15: SEO — robots, sitemap, OG image

**Files:**
- Create: `apps/web/app/robots.ts`
- Create: `apps/web/app/sitemap.ts`
- Create: `apps/web/app/opengraph-image.tsx`

- [ ] **Step 1: robots.ts**

Create `apps/web/app/robots.ts`:

```typescript
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://axentraitalia.cloud";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/features", "/prezzi", "/contatti", "/privacy", "/termini", "/cookie"],
        disallow: ["/api/", "/admin", "/consulente", "/azienda", "/onboarding", "/login", "/register"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: sitemap.ts**

Create `apps/web/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://axentraitalia.cloud";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/features`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/prezzi`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/contatti`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/termini`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cookie`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
```

- [ ] **Step 3: opengraph-image.tsx**

Create `apps/web/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FinAgevolata — La piattaforma dove consulenti e aziende lavorano insieme sui bandi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #ECFDF5 100%)",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: "#6366F1" }}>FinAgevolata</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#0F172A",
            textAlign: "center",
            lineHeight: 1.15,
            marginTop: 40,
            letterSpacing: "-0.02em",
          }}
        >
          Consulenti e aziende insieme sui bandi.
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#475569",
            marginTop: 30,
            textAlign: "center",
          }}
        >
          Finanza agevolata senza Excel, senza email perse.
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 4: Extend root metadata with canonical base**

Edit `apps/web/app/layout.tsx`. Replace the `metadata` export with:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL("https://axentraitalia.cloud"),
  title: {
    default: "FinAgevolata — Piattaforma Finanza Agevolata",
    template: "%s | FinAgevolata",
  },
  description: "Gestisci bandi e documenti per la finanza agevolata",
};
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @finagevolata/web dev`
Open `/robots.txt`, `/sitemap.xml`, `/opengraph-image`. Expected: all three return valid content.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/robots.ts apps/web/app/sitemap.ts apps/web/app/opengraph-image.tsx apps/web/app/layout.tsx
git commit -m "feat(marketing): robots, sitemap, OG image, canonical metadata base"
```

---

## Task 16: Homepage JSON-LD structured data

**Files:**
- Modify: `apps/web/app/(marketing)/page.tsx`

- [ ] **Step 1: Inject SoftwareApplication JSON-LD**

In `apps/web/app/(marketing)/page.tsx`, inside the returned fragment (as the very first child of `<>`), add the script tag:

```tsx
<script
  type="application/ld+json"
  // eslint-disable-next-line react/no-danger
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "FinAgevolata",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: [
        { "@type": "Offer", price: "0", priceCurrency: "EUR", name: "Free" },
        { "@type": "Offer", price: "39", priceCurrency: "EUR", name: "Pro Azienda" },
        { "@type": "Offer", price: "149", priceCurrency: "EUR", name: "Consulente" },
        { "@type": "Offer", price: "399", priceCurrency: "EUR", name: "Studio" },
      ],
      description: "Piattaforma SaaS italiana per la gestione di bandi di finanza agevolata. Ponte bidirezionale tra consulenti e aziende, con integrazione Click Day MouseX.",
    }),
  }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(marketing\)/page.tsx
git commit -m "feat(marketing): SoftwareApplication JSON-LD on homepage"
```

---

## Task 17: Signup integration — accept ?plan, persist on user

**Files:**
- Modify: `packages/shared/src/schemas/auth.ts`
- Modify: `apps/web/lib/actions/auth.ts`
- Modify: `apps/web/app/(auth)/register/page.tsx`

- [ ] **Step 1: Extend schema**

Edit `packages/shared/src/schemas/auth.ts`. Replace with:

```typescript
import { z } from "zod";

export const PLAN_SLUGS = ["free", "pro-azienda", "consulente", "studio"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  name: z.string().min(2, "Nome troppo corto"),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  role: z.enum(["CONSULTANT", "COMPANY"], {
    errorMap: () => ({ message: "Ruolo non valido" }),
  }),
  plan: z.enum(PLAN_SLUGS).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Update register action to persist plan**

Edit `apps/web/lib/actions/auth.ts`. Replace with:

```typescript
"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema, type PlanSlug } from "@finagevolata/shared";

function slugToPlanEnum(slug: PlanSlug): "FREE" | "PRO_AZIENDA" | "CONSULENTE" | "STUDIO" {
  return slug.toUpperCase().replace("-", "_") as "FREE" | "PRO_AZIENDA" | "CONSULENTE" | "STUDIO";
}

export async function registerUser(formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    plan: (formData.get("plan") as string | null) || undefined,
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
      plan: parsed.data.plan ? slugToPlanEnum(parsed.data.plan) : "FREE",
    },
  });

  return { success: true };
}
```

- [ ] **Step 3: Update register page to read ?plan and force role when implied**

Edit `apps/web/app/(auth)/register/page.tsx`. Replace with:

```tsx
"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/actions/auth";

const PLAN_ROLE: Record<string, "CONSULTANT" | "COMPANY"> = {
  free: "COMPANY",
  "pro-azienda": "COMPANY",
  consulente: "CONSULTANT",
  studio: "CONSULTANT",
};

interface RegisterPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const { plan } = use(searchParams);
  const router = useRouter();
  const [error, setError] = useState("");
  const forcedRole = plan ? PLAN_ROLE[plan] : undefined;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (plan) formData.set("plan", plan);
    if (forcedRole) formData.set("role", forcedRole);

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
        {plan ? (
          <p className="rounded-md bg-indigo-50 p-3 text-center text-sm text-indigo-700">
            Stai attivando il piano <strong>{plan}</strong>.
          </p>
        ) : null}
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
          {forcedRole ? (
            <input type="hidden" name="role" value={forcedRole} />
          ) : (
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Sono un...</label>
              <select id="role" name="role" required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="">Seleziona ruolo</option>
                <option value="CONSULTANT">Consulente di finanza agevolata</option>
                <option value="COMPANY">Azienda</option>
              </select>
            </div>
          )}
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

- [ ] **Step 4: Verify end-to-end**

Run: `pnpm --filter @finagevolata/web dev`
1. Open `/register?plan=consulente` → role dropdown hidden, banner "piano consulente".
2. Submit form → user created with `plan = CONSULENTE`, role `CONSULTANT`.
3. Log in → redirected to `/consulente`.
4. Query DB (`prisma studio` or psql): confirm `users.plan = 'CONSULENTE'`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/auth.ts apps/web/lib/actions/auth.ts apps/web/app/\(auth\)/register/page.tsx
git commit -m "feat(auth): register accepts ?plan param, persists User.plan, forces role"
```

---

## Task 18: Launch smoke + production build

**Files:**
- None new; final verification only.

- [ ] **Step 1: Clean build**

Run: `pnpm --filter @finagevolata/web build`
Expected: build succeeds, no type errors.

- [ ] **Step 2: Run full test suite**

Run: `pnpm --filter @finagevolata/web test`
Expected: all tests pass (including new `submitContact` tests and existing `auth.test.ts`).

- [ ] **Step 3: Manual responsive check**

Run: `pnpm --filter @finagevolata/web start`
Using Chrome DevTools responsive mode:
- 375px (iPhone SE): all pages render without overflow; header shows hamburger.
- 768px (iPad): pricing table stays 2x2 or switches layout cleanly.
- 1024px+ (desktop): all layouts final.

- [ ] **Step 4: Lighthouse audit**

In Chrome DevTools → Lighthouse → run on `/`, `/features`, `/prezzi`, `/contatti`.
Expected targets: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100.

If Performance < 90, investigate: likely images (replace with `next/image` if added later) or hero gradient. Accept ≥ 85 on this pass; Module E will harden.

- [ ] **Step 5: Ensure env vars set on Vercel**

On Vercel project settings → Environment Variables:
- `CONTACT_EMAIL_TO = axentra.italia@gmail.com` (all envs)
- `RESEND_API_KEY = re_xxx` (already set)
- `EMAIL_FROM = onboarding@resend.dev` (sandbox) or `noreply@axentraitalia.cloud` when DNS ready

- [ ] **Step 6: Push and verify deploy**

```bash
git push origin main
```

Wait for Vercel deploy to finish. Then smoke test on production URL:
1. `/` loads homepage
2. Click "Inizia gratis" → `/register?plan=free` carries query param
3. `/prezzi` → toggle works
4. `/contatti` → submit real message → arrives at `axentra.italia@gmail.com`, appears in `contact_leads` table
5. `/robots.txt` and `/sitemap.xml` return 200
6. Logged-in user visiting `/` → redirected to dashboard

- [ ] **Step 7: Final commit (if any polish needed)**

If fixes were needed after smoke:

```bash
git add -p
git commit -m "fix(marketing): post-deploy adjustments"
git push origin main
```

---

## Self-Review (completed by author)

**Spec coverage:**
- Spec §3 Rotte: all routes created in Tasks 3, 7, 8, 10, 12, 13.
- Spec §4 Contenuto: homepage (T7), features (T8), prezzi (T10), contatti (T12), legal (T13).
- Spec §5 Design System: primitives (T6), header/footer (T5), logo (T4).
- Spec §6 Integrazione: Prisma (T1), env (T2), middleware (T14), register plan (T17), contact Server Action (T11).
- Spec §7 SEO: robots/sitemap/OG image (T15), JSON-LD (T16), canonical base (T15 step 4).
- Spec §8 Testing: unit tests (T11), smoke (T18).
- Spec §9 Launch Checklist: smoke + env vars (T18).

**Placeholder scan:** none — every step ships full code.

**Type consistency:** `PlanSlug` defined once in `apps/web/lib/marketing/plans.ts`, mirrored as literal union in `packages/shared/src/schemas/auth.ts`. `slugToPlanEnum` / `planToPrismaEnum` perform the same mapping; not DRY across packages but acceptable because the shared package can't import from `apps/web`. `submitContact` signature matches test expectations (rejects → throws, success → `{ok: true}`). Feature card `icon` is `LucideIcon` in T6 and all usages in T7 pass lucide icons.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-marketing-landing.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
