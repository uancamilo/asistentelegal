-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "maxUsers" INTEGER;

-- CreateTable
CREATE TABLE "account_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_invitations_token_key" ON "account_invitations"("token");

-- CreateIndex
CREATE INDEX "account_invitations_token_idx" ON "account_invitations"("token");

-- CreateIndex
CREATE INDEX "account_invitations_email_idx" ON "account_invitations"("email");

-- CreateIndex
CREATE INDEX "account_invitations_accountId_idx" ON "account_invitations"("accountId");

-- CreateIndex
CREATE INDEX "account_invitations_status_idx" ON "account_invitations"("status");

-- CreateIndex
CREATE INDEX "account_invitations_expiresAt_idx" ON "account_invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "account_invitations" ADD CONSTRAINT "account_invitations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
