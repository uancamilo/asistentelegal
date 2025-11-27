-- ============================================
-- Migration: 003_add_document_chunks
-- Description: Add document_chunks table for granular embeddings
--              and remove embedding column from documents table
-- ============================================

-- Step 1: Create document_chunks table
CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),  -- text-embedding-3-small dimensions
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add unique constraint for document + chunk index
ALTER TABLE "document_chunks"
ADD CONSTRAINT "document_chunks_documentId_chunkIndex_key"
UNIQUE ("documentId", "chunkIndex");

-- Step 3: Add foreign key constraint to documents
ALTER TABLE "document_chunks"
ADD CONSTRAINT "document_chunks_documentId_fkey"
FOREIGN KEY ("documentId")
REFERENCES "documents"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS "document_chunks_documentId_idx" ON "document_chunks"("documentId");
CREATE INDEX IF NOT EXISTS "document_chunks_chunkIndex_idx" ON "document_chunks"("chunkIndex");

-- Step 5: Create vector index for semantic search (HNSW for better performance)
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx"
ON "document_chunks"
USING hnsw ("embedding" vector_cosine_ops);

-- Step 6: Remove embedding column from documents table
-- NOTE: This is a destructive operation - backup data if needed before running
ALTER TABLE "documents" DROP COLUMN IF EXISTS "embedding";

-- Step 7: Add trigger to update updatedAt automatically
CREATE OR REPLACE FUNCTION update_document_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_document_chunks_updated_at_trigger ON "document_chunks";
CREATE TRIGGER update_document_chunks_updated_at_trigger
    BEFORE UPDATE ON "document_chunks"
    FOR EACH ROW
    EXECUTE FUNCTION update_document_chunks_updated_at();

-- ============================================
-- Rollback script (run manually if needed):
-- ============================================
-- DROP TRIGGER IF EXISTS update_document_chunks_updated_at_trigger ON "document_chunks";
-- DROP FUNCTION IF EXISTS update_document_chunks_updated_at();
-- DROP INDEX IF EXISTS "document_chunks_embedding_idx";
-- DROP INDEX IF EXISTS "document_chunks_chunkIndex_idx";
-- DROP INDEX IF EXISTS "document_chunks_documentId_idx";
-- DROP TABLE IF EXISTS "document_chunks";
-- ALTER TABLE "documents" ADD COLUMN "embedding" vector(1536);
