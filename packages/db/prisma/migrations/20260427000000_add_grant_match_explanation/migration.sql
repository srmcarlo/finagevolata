-- CreateTable
CREATE TABLE "grant_match_explanations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "rulesScore" INTEGER NOT NULL,
    "semanticScore" INTEGER NOT NULL,
    "matchedChips" TEXT[],
    "paragraph" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grant_match_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grant_match_explanations_companyId_grantId_key" ON "grant_match_explanations"("companyId", "grantId");

-- CreateIndex
CREATE INDEX "grant_match_explanations_companyId_computedAt_idx" ON "grant_match_explanations"("companyId", "computedAt");

-- AddForeignKey
ALTER TABLE "grant_match_explanations" ADD CONSTRAINT "grant_match_explanations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_match_explanations" ADD CONSTRAINT "grant_match_explanations_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance indexes for hard-filter on grants
CREATE INDEX IF NOT EXISTS "idx_grants_ateco_gin"  ON "grants" USING gin ("eligibleAtecoCodes");
CREATE INDEX IF NOT EXISTS "idx_grants_region_gin" ON "grants" USING gin ("eligibleRegions");
