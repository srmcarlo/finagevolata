-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO_AZIENDA', 'CONSULENTE', 'STUDIO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "PlanType" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "contact_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "plan" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_leads_email_idx" ON "contact_leads"("email");

-- CreateIndex
CREATE INDEX "contact_leads_createdAt_idx" ON "contact_leads"("createdAt");

-- CreateIndex
CREATE INDEX "contact_leads_ipHash_createdAt_idx" ON "contact_leads"("ipHash", "createdAt");
