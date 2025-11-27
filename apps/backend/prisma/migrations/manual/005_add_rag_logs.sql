-- Migration: 005_add_rag_logs
-- Description: Create table for RAG telemetry and audit logs
-- Date: 2024-01-XX
--
-- This table stores telemetry data for RAG queries including:
-- - User queries (for analytics)
-- - Sources used (document references)
-- - Performance metrics (timing, scores)
-- - Truncated answer summary (NOT full answers for privacy)
--
-- To enable logging to this table, set:
--   ASSISTANT_LOG_TO_DB=true
--
-- Run with:
--   psql -d asistencialegal -f apps/backend/prisma/migrations/manual/005_add_rag_logs.sql

-- Create rag_logs table
CREATE TABLE IF NOT EXISTS "rag_logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "metrics" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "answerSummary" TEXT,
    "ip" TEXT,
    "userId" TEXT,

    -- Foreign key to users table (optional, may be null for anonymous queries)
    CONSTRAINT "fk_rag_logs_user" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_rag_logs_created_at" ON "rag_logs" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_rag_logs_user_id" ON "rag_logs" ("userId");

-- Create GIN index for JSONB queries on sources (e.g., find logs by documentId)
CREATE INDEX IF NOT EXISTS "idx_rag_logs_sources" ON "rag_logs" USING GIN ("sources");

-- Add comment for documentation
COMMENT ON TABLE "rag_logs" IS 'Telemetry and audit logs for RAG (Retrieval Augmented Generation) queries. Full answers are NOT stored for privacy reasons.';
COMMENT ON COLUMN "rag_logs"."query" IS 'Original user query text';
COMMENT ON COLUMN "rag_logs"."sources" IS 'JSONB array of document sources used: [{documentId, chunkId, score, snippetLength}]';
COMMENT ON COLUMN "rag_logs"."metrics" IS 'JSONB object with timing and context metrics';
COMMENT ON COLUMN "rag_logs"."answerSummary" IS 'Truncated answer summary (max ~150 chars) - NOT full answer';
COMMENT ON COLUMN "rag_logs"."ip" IS 'Client IP address (semi-sensitive, optional)';
COMMENT ON COLUMN "rag_logs"."userId" IS 'User ID if authenticated, NULL for anonymous queries';

-- Verify table creation
SELECT 'rag_logs table created successfully' AS status;
