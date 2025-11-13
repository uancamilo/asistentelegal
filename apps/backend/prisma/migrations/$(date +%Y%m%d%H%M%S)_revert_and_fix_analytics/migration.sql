-- Migration: Revert and Fix Analytics
-- Agregar solo las columnas necesarias para las tablas de detalle

-- Step 1: Agregar columnas necesarias a search_queries
ALTER TABLE "search_queries" ADD COLUMN IF NOT EXISTS "totalResults" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "search_queries" ADD COLUMN IF NOT EXISTS "executionTimeMs" INTEGER NOT NULL DEFAULT 0;

-- Step 2: Las columnas que ya tenemos y mantenemos:
-- - id
-- - userId
-- - query
-- - hasResults
-- - createdAt

-- Step 3: NO recreamos search_query_clicks (no la necesitamos)
