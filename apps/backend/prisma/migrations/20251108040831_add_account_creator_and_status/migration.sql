/*
  Warnings:

  - Added the required column `createdBy` to the `Account` table without a default value. This is not possible if the table is not empty.

  Migration Strategy:
  - Para cuentas existentes, se asigna el SUPER_ADMIN como createdBy
  - El status de cuentas existentes se establece como ACTIVE (ya están operativas)
*/

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_ownerId_fkey";

-- AlterTable: Agregar campos con valores temporales para datos existentes
ALTER TABLE "Account"
  ADD COLUMN "createdBy" TEXT,
  ADD COLUMN "status" "AccountStatus" DEFAULT 'ACTIVE',
  ALTER COLUMN "ownerId" DROP NOT NULL;

-- Actualizar cuentas existentes: asignar SUPER_ADMIN como createdBy
-- (Usamos el owner actual como createdBy para cuentas existentes)
UPDATE "Account"
SET "createdBy" = "ownerId"
WHERE "createdBy" IS NULL AND "ownerId" IS NOT NULL;

-- Hacer createdBy NOT NULL ahora que todas las filas tienen valor
ALTER TABLE "Account"
  ALTER COLUMN "createdBy" SET NOT NULL;

-- Hacer status NOT NULL con default PENDING para nuevas filas
ALTER TABLE "Account"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "Account_createdBy_idx" ON "Account"("createdBy");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
