-- DropIndex (if exists from previous migration)
-- This index was created in migration 20251017183059_remove_unique_role_constraint
-- We're replacing it with the original naming convention from the init migration
DROP INDEX IF EXISTS "public"."User_role_super_admin_unique";

-- DropIndex (if exists from initial migration)
-- Ensure we remove any previous instance of unique_super_admin before recreating it
DROP INDEX IF EXISTS "public"."unique_super_admin";
DROP INDEX IF EXISTS "unique_super_admin";

-- CreateIndex
-- Restore the original unique constraint for SUPER_ADMIN with the proper name
-- This ensures only one SUPER_ADMIN can exist in the database
-- Uses the original syntax from migration 20251014205642_init_users_table
CREATE UNIQUE INDEX "unique_super_admin" ON "User" ((role)) WHERE role = 'SUPER_ADMIN';
