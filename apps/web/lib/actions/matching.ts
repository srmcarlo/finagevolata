"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  combineScores,
  computeRulesScore,
  deriveChips,
  type MatchScore,
} from "@/lib/services/matching";
import { generateExplanation } from "@/lib/services/match-explanation";
import type { CompanySize, Grant } from "@finagevolata/db";

const EXPLANATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Role = "ADMIN" | "CONSULTANT" | "COMPANY";

async function requireSession(allowed: Role[]) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: Role } | undefined;
  if (!user?.id) throw new Error("Non autorizzato");
  if (!allowed.includes(user.role as Role)) throw new Error("Accesso negato");
  return { userId: user.id, role: user.role as Role };
}

interface HardFilterRow {
  id: string;
  title: string;
  description: string;
  issuingBody: string;
  grantType: string;
  minAmount: number | null;
  maxAmount: number | null;
  deadline: Date | null;
  eligibleAtecoCodes: string[];
  eligibleRegions: string[];
  eligibleCompanySizes: CompanySize[];
  approvedByAdmin: boolean;
}

async function loadEligibleGrants(profile: {
  atecoCode: string;
  region: string;
}): Promise<HardFilterRow[]> {
  const division = profile.atecoCode.split(".")[0] ?? profile.atecoCode;
  return prisma.$queryRaw<HardFilterRow[]>`
    SELECT id, title, description, "issuingBody", "grantType",
           "minAmount"::float8 AS "minAmount",
           "maxAmount"::float8 AS "maxAmount",
           deadline,
           "eligibleAtecoCodes",
           "eligibleRegions",
           "eligibleCompanySizes",
           "approvedByAdmin"
    FROM grants
    WHERE status = 'PUBLISHED'
      AND ${profile.region} = ANY("eligibleRegions")
      AND (
        ${profile.atecoCode} = ANY("eligibleAtecoCodes")
        OR EXISTS (
          SELECT 1 FROM unnest("eligibleAtecoCodes") AS code
          WHERE code LIKE ${division + ".%"} OR code = ${division}
        )
      )
  `;
}

async function loadSimilarities(
  profileEmbedding: unknown,
  grantIds: string[]
): Promise<Map<string, number>> {
  if (!profileEmbedding || grantIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
    SELECT id, 1 - (embedding <=> ${profileEmbedding}::vector) AS similarity
    FROM grants
    WHERE id = ANY(${grantIds}) AND embedding IS NOT NULL
  `;
  return new Map(rows.map((r) => [r.id, r.similarity]));
}

export async function matchGrantsForCompany(
  companyId: string,
  opts?: { limit?: number; offset?: number; minScore?: number }
): Promise<Array<{ grant: Grant; score: MatchScore }>> {
  const { userId, role } = await requireSession(["ADMIN", "CONSULTANT", "COMPANY"]);
  if (role === "COMPANY" && userId !== companyId) throw new Error("Non autorizzato");
  if (role === "CONSULTANT") {
    const link = await prisma.consultantCompany.findFirst({
      where: { consultantId: userId, companyId, status: "ACTIVE" },
    });
    if (!link) throw new Error("Non autorizzato");
  }

  const profile = await prisma.companyProfile.findUnique({ where: { userId: companyId } });
  if (!profile) return [];

  const grants = await loadEligibleGrants({
    atecoCode: profile.atecoCode,
    region: profile.region,
  });
  if (grants.length === 0) return [];

  const sims = await loadSimilarities(
    (profile as unknown as { embedding?: unknown }).embedding,
    grants.map((g) => g.id)
  );

  const annualRevenue =
    profile.annualRevenue == null ? null : Number(profile.annualRevenue);

  const scored = grants
    .map((g) => {
      const rules = computeRulesScore(
        { atecoCode: profile.atecoCode, employeeCount: profile.employeeCount, annualRevenue },
        {
          eligibleAtecoCodes: g.eligibleAtecoCodes,
          eligibleCompanySizes: g.eligibleCompanySizes,
          minAmount: g.minAmount,
          maxAmount: g.maxAmount,
          deadline: g.deadline,
          approvedByAdmin: g.approvedByAdmin,
        }
      );
      const sim = sims.get(g.id);
      const semanticScore = sim == null ? 50 : Math.round(sim * 100);
      const total = combineScores(rules.score, semanticScore);
      const chips = deriveChips(rules.breakdown, semanticScore, g.approvedByAdmin);
      return {
        grant: g as unknown as Grant,
        score: {
          total,
          rulesScore: rules.score,
          semanticScore,
          breakdown: rules.breakdown,
          chips,
        } satisfies MatchScore,
      };
    })
    .filter((r) => (opts?.minScore == null ? true : r.score.total >= opts.minScore))
    .sort((a, b) => b.score.total - a.score.total);

  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? scored.length;
  return scored.slice(offset, offset + limit);
}

export async function getMatchScoresForGrants(
  companyId: string,
  grantIds: string[]
): Promise<Map<string, MatchScore>> {
  if (grantIds.length === 0) return new Map();
  const all = await matchGrantsForCompany(companyId);
  const wanted = new Set(grantIds);
  const map = new Map<string, MatchScore>();
  for (const r of all) {
    if (wanted.has(r.grant.id)) map.set(r.grant.id, r.score);
  }
  return map;
}

export async function getMatchScoreForGrant(
  companyId: string,
  grantId: string
): Promise<MatchScore | null> {
  const m = await getMatchScoresForGrants(companyId, [grantId]);
  return m.get(grantId) ?? null;
}

export async function getTopMatchesForDashboard(
  companyId: string,
  limit = 5
): Promise<Array<{ grant: Grant; score: MatchScore }>> {
  return matchGrantsForCompany(companyId, { limit });
}

export async function getMatchExplanation(
  companyId: string,
  grantId: string
): Promise<{
  paragraph: string;
  chips: MatchScore["chips"];
  score: MatchScore;
  fromCache: boolean;
}> {
  const score = await getMatchScoreForGrant(companyId, grantId);
  if (!score) throw new Error("Bando non eleggibile per questa azienda");

  const cached = await prisma.grantMatchExplanation.findUnique({
    where: { companyId_grantId: { companyId, grantId } },
  });

  const isFresh =
    cached && Date.now() - cached.computedAt.getTime() < EXPLANATION_TTL_MS;

  if (cached && isFresh) {
    return {
      paragraph: cached.paragraph,
      chips: cached.matchedChips as MatchScore["chips"],
      score,
      fromCache: true,
    };
  }

  const profile = await prisma.companyProfile.findUnique({ where: { userId: companyId } });
  const grant = await prisma.grant.findUnique({ where: { id: grantId } });
  if (!profile || !grant) throw new Error("Dati non disponibili");

  const paragraph =
    (await generateExplanation({
      companyName: profile.companyName,
      atecoCode: profile.atecoCode,
      atecoDescription: profile.atecoDescription,
      region: profile.region,
      employeeCount: profile.employeeCount,
      grantTitle: grant.title,
      issuingBody: grant.issuingBody,
      minAmount: grant.minAmount == null ? null : Number(grant.minAmount),
      maxAmount: grant.maxAmount == null ? null : Number(grant.maxAmount),
      deadline: grant.deadline,
      matchScore: score.total,
      chips: score.chips,
    })) ?? "Non e' stato possibile generare la spiegazione automatica.";

  await prisma.grantMatchExplanation.upsert({
    where: { companyId_grantId: { companyId, grantId } },
    create: {
      companyId,
      grantId,
      matchScore: score.total,
      rulesScore: score.rulesScore,
      semanticScore: score.semanticScore,
      matchedChips: score.chips,
      paragraph,
    },
    update: {
      matchScore: score.total,
      rulesScore: score.rulesScore,
      semanticScore: score.semanticScore,
      matchedChips: score.chips,
      paragraph,
      computedAt: new Date(),
    },
  });

  return { paragraph, chips: score.chips, score, fromCache: false };
}

export async function invalidateMatchExplanations(opts: {
  companyId?: string;
  grantId?: string;
}): Promise<void> {
  if (opts.companyId) {
    await prisma.grantMatchExplanation.deleteMany({ where: { companyId: opts.companyId } });
    return;
  }
  if (opts.grantId) {
    await prisma.grantMatchExplanation.deleteMany({ where: { grantId: opts.grantId } });
    return;
  }
}

async function loadConsultantClients(consultantId: string) {
  return prisma.consultantCompany.findMany({
    where: { consultantId, status: "ACTIVE" },
    include: { company: true },
  });
}

export async function matchClientsForGrant(
  consultantId: string,
  grantId: string
): Promise<
  Array<{ companyId: string; companyName: string; score: MatchScore; hasPractice: boolean }>
> {
  const { userId } = await requireSession(["CONSULTANT", "ADMIN"]);
  if (userId !== consultantId) throw new Error("Non autorizzato");

  const links = await loadConsultantClients(consultantId);
  if (links.length === 0) return [];

  const practices = await prisma.practice.findMany({
    where: { consultantId, grantId, companyId: { in: links.map((l) => l.companyId) } },
    select: { companyId: true },
  });
  const practiceSet = new Set(practices.map((p) => p.companyId));

  const results: Array<{
    companyId: string;
    companyName: string;
    score: MatchScore;
    hasPractice: boolean;
  }> = [];
  for (const link of links) {
    const score = await getMatchScoreForGrant(link.companyId, grantId);
    if (!score) continue;
    results.push({
      companyId: link.companyId,
      companyName: (link.company as { name: string }).name,
      score,
      hasPractice: practiceSet.has(link.companyId),
    });
  }
  return results.sort((a, b) => b.score.total - a.score.total);
}

export async function matchGrantsForConsultantClients(
  consultantId: string,
  opts?: { clientId?: string; topNPerClient?: number }
): Promise<Map<string, Array<{ grant: Grant; score: MatchScore }>>> {
  const { userId } = await requireSession(["CONSULTANT", "ADMIN"]);
  if (userId !== consultantId) throw new Error("Non autorizzato");

  const links = await loadConsultantClients(consultantId);
  const targetIds = opts?.clientId ? [opts.clientId] : links.map((l) => l.companyId);
  const top = opts?.topNPerClient ?? 5;

  const out = new Map<string, Array<{ grant: Grant; score: MatchScore }>>();
  for (const id of targetIds) {
    out.set(id, await matchGrantsForCompany(id, { limit: top }));
  }
  return out;
}

export async function getTopOpportunitiesForConsultant(
  consultantId: string,
  limit = 10
): Promise<
  Array<{
    companyId: string;
    companyName: string;
    grant: Grant;
    score: MatchScore;
    priority: number;
  }>
> {
  const all = await matchGrantsForConsultantClients(consultantId);
  const links = await loadConsultantClients(consultantId);
  const nameById = new Map(links.map((l) => [l.companyId, (l.company as { name: string }).name]));

  const flat: Array<{
    companyId: string;
    companyName: string;
    grant: Grant;
    score: MatchScore;
    priority: number;
  }> = [];
  for (const [companyId, rows] of all) {
    for (const r of rows) {
      const days =
        r.grant.deadline == null
          ? null
          : Math.floor((r.grant.deadline.getTime() - Date.now()) / 86400000);
      const urgency = days == null ? 0 : Math.max(0, Math.min(1, 1 - days / 90));
      const priority = r.score.total + 20 * urgency;
      flat.push({
        companyId,
        companyName: nameById.get(companyId) ?? "",
        grant: r.grant,
        score: r.score,
        priority,
      });
    }
  }
  return flat.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
