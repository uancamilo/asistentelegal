-- ============================================
-- Migration: 004_fix_embedding_dimensions
-- Description: Change embedding dimension from 3072 to 1536
--              (text-embedding-3-large → text-embedding-3-small)
-- ============================================

-- NOTE: This migration is only needed if you already ran 003_add_document_chunks.sql
-- with vector(3072). If you haven't run it yet, the corrected 003 file already
-- uses vector(1536).

-- Step 1: Drop the existing vector index (if exists)
DROP INDEX IF EXISTS "document_chunks_embedding_idx";

-- Step 2: Delete existing chunks (embeddings will need to be regenerated)
-- This is necessary because existing embeddings have wrong dimensions
DELETE FROM "document_chunks";

-- Step 3: Alter the column type from vector(3072) to vector(1536)
ALTER TABLE "document_chunks"
ALTER COLUMN "embedding" TYPE vector(1536);

-- Step 4: Recreate the vector index with correct dimensions
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx"
ON "document_chunks"
USING hnsw ("embedding" vector_cosine_ops);

-- Step 5: Reset embedding status on documents so they get reprocessed
UPDATE "documents"
SET "embeddingStatus" = 'PENDING'
WHERE "embeddingStatus" = 'COMPLETED';

-- ============================================
-- Rollback script (if you need to go back to 3072):
-- ============================================
-- DROP INDEX IF EXISTS "document_chunks_embedding_idx";
-- DELETE FROM "document_chunks";
-- ALTER TABLE "document_chunks" ALTER COLUMN "embedding" TYPE vector(3072);
-- CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);
