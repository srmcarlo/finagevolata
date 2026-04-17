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
  return slug.toUpperCase().replace(/-/g, "_") as "FREE" | "PRO_AZIENDA" | "CONSULENTE" | "STUDIO";
}
