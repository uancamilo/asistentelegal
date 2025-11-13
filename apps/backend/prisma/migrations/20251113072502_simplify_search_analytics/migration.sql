-- Migration: Simplify Search Analytics
-- Eliminación agresiva de columnas innecesarias y tabla SearchQueryClick

-- Step 1: Eliminar tabla search_query_clicks completamente
DROP TABLE IF EXISTS "search_query_clicks" CASCADE;

-- Step 2: Eliminar columnas innecesarias de search_queries
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "queryLength";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "searchType";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "filters";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "totalResults";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "topResultIds";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "executionTimeMs";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "openaiLatencyMs";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "pgvectorLatencyMs";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "tokensUsed";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "estimatedCostUsd";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "success";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "errorMessage";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "sessionId";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "ipAddress";
ALTER TABLE "search_queries" DROP COLUMN IF EXISTS "userAgent";

-- Step 3: Eliminar índices innecesarios (los que usaban las columnas eliminadas)
DROP INDEX IF EXISTS "search_queries_searchType_idx";
DROP INDEX IF EXISTS "search_queries_success_idx";
DROP INDEX IF EXISTS "search_queries_query_idx";

-- Step 4: Los índices necesarios ya existen:
-- - search_queries_userId_idx
-- - search_queries_userId_createdAt_idx
-- - search_queries_createdAt_idx
-- - search_queries_hasResults_idx
