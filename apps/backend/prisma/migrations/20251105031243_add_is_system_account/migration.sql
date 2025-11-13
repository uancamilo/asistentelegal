-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "isSystemAccount" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
