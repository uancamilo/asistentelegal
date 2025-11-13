-- DropIndex
-- Remove duplicate/redundant unique index for SUPER_ADMIN constraint
-- This index was created by migration 20251017183059_remove_unique_role_constraint
-- and is redundant with the original index "unique_super_admin" from the initial migration
DROP INDEX IF EXISTS "public"."User_role_super_admin_unique";

-- Verification comment:
-- After this migration, only "unique_super_admin" should remain active
-- Both indexes enforce the same constraint: only one SUPER_ADMIN user allowed
-- Keeping only the original index maintains consistency with the project's naming convention
