-- Migration: Add processing and review fields to documents table
-- Date: 2024-11-25
-- Description: Enables URL ingestion, processing status tracking, and human review workflow
-- SAFE: All new columns are NULLABLE to maintain backward compatibility

-- ============================================
-- 1. ENSURE PGVECTOR EXTENSION EXISTS
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. ADD NEW COLUMNS TO DOCUMENTS TABLE
-- ============================================

-- Source tracking (for URL ingestion)
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;

-- Processing status tracking
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "processingStatus" "ProcessingStatus" DEFAULT 'MANUAL';

-- Embedding status tracking (separate from document processing)
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "embeddingStatus" "ProcessingStatus" DEFAULT 'PENDING';

-- Embedding error message (for retry logic)
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "embeddingError" TEXT;

-- Human review tracking
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;

ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- Rejection reason (when document is rejected during review)
ALTER TABLE "documents"
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- ============================================
-- 3. ADD FOREIGN KEY FOR REVIEWER
-- ============================================
-- Note: Only add if not exists to prevent duplicate constraint errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'documents_reviewedBy_fkey'
    ) THEN
        ALTER TABLE "documents"
        ADD CONSTRAINT "documents_reviewedBy_fkey"
        FOREIGN KEY ("reviewedBy") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 4. ADD INDEXES FOR NEW COLUMNS
-- ============================================
CREATE INDEX IF NOT EXISTS "documents_processingStatus_idx" ON "documents"("processingStatus");
CREATE INDEX IF NOT EXISTS "documents_embeddingStatus_idx" ON "documents"("embeddingStatus");
CREATE INDEX IF NOT EXISTS "documents_sourceUrl_idx" ON "documents"("sourceUrl") WHERE "sourceUrl" IS NOT NULL;

-- ============================================
-- 5. HNSW INDEX FOR EMBEDDING (if not exists)
-- ============================================
-- Note: HNSW provides faster approximate nearest neighbor search
-- Only create if embedding column exists and index doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'documents_embedding_hnsw_idx'
    ) THEN
        -- Check if embedding column exists before creating index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'documents' AND column_name = 'embedding'
        ) THEN
            CREATE INDEX "documents_embedding_hnsw_idx"
            ON "documents"
            USING hnsw ("embedding" vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
        END IF;
    END IF;
END $$;

-- ============================================
-- 6. VERIFICATION QUERY (run after migration)
-- ============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'documents'
-- AND column_name IN ('sourceUrl', 'processingStatus', 'embeddingStatus', 'embeddingError', 'reviewedBy', 'reviewedAt', 'rejectionReason');
