-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "subscribedToGrantAlerts" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "client_invites" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_invites_token_key" ON "client_invites"("token");

-- CreateIndex
CREATE INDEX "client_invites_consultantId_idx" ON "client_invites"("consultantId");

-- CreateIndex
CREATE INDEX "client_invites_token_idx" ON "client_invites"("token");

-- CreateIndex
CREATE INDEX "client_invites_status_expiresAt_idx" ON "client_invites"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "client_invites" ADD CONSTRAINT "client_invites_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
