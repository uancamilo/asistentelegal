-- DropIndex
DROP INDEX "public"."User_role_key";

-- CreateIndex: Partial unique index to enforce only one SUPER_ADMIN
-- This allows multiple users with other roles, but only one SUPER_ADMIN
CREATE UNIQUE INDEX "User_role_super_admin_unique" ON "public"."User"("role") WHERE "role" = 'SUPER_ADMIN';
