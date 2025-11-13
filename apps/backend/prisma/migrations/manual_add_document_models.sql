-- Manual Migration: Add Document Management Models
-- Created: 2025-11-10
-- Purpose: Add all document-related tables for legal document management with AI

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "DocumentType" AS ENUM (
  'CONSTITUCION',
  'TRATADO_INTERNACIONAL',
  'LEY_ORGANICA',
  'LEY_ORDINARIA',
  'DECRETO_LEY',
  'DECRETO',
  'REGLAMENTO',
  'ORDENANZA',
  'RESOLUCION',
  'ACUERDO',
  'CIRCULAR',
  'DIRECTIVA',
  'OTRO'
);

CREATE TYPE "DocumentStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'ARCHIVED',
  'DEROGATED'
);

CREATE TYPE "DocumentRelationType" AS ENUM (
  'DEROGA',
  'MODIFICA',
  'COMPLEMENTA',
  'REGLAMENTA',
  'SUSTITUYE',
  'ACLARA',
  'RATIFICA',
  'INCORPORA',
  'DESARROLLA'
);

CREATE TYPE "ProcessingStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'MANUAL'
);

CREATE TYPE "DocumentScope" AS ENUM (
  'NACIONAL',
  'REGIONAL',
  'MUNICIPAL',
  'LOCAL',
  'INTERNACIONAL'
);

-- ============================================
-- MAIN DOCUMENT TABLE
-- ============================================

CREATE TABLE "documents" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "documentNumber" TEXT,
  "abbreviation" TEXT,
  "type" "DocumentType" NOT NULL,
  "hierarchyLevel" INTEGER NOT NULL,
  "scope" "DocumentScope" NOT NULL DEFAULT 'NACIONAL',
  "subject" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "issuingEntity" TEXT NOT NULL,
  "issuingEntityType" TEXT,
  "issueDate" TIMESTAMP(3),
  "publicationDate" TIMESTAMP(3),
  "effectiveDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "summary" TEXT,
  "fullText" TEXT,
  "observations" TEXT,
  "embedding" vector NOT NULL DEFAULT ARRAY[]::vector,
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT,
  "publishedBy" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- DOCUMENT VERSIONS
-- ============================================

CREATE TABLE "document_versions" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "fullText" TEXT,
  "summary" TEXT,
  "changeLog" TEXT,
  "reason" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- DOCUMENT SECTIONS
-- ============================================

CREATE TABLE "document_sections" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "sectionType" TEXT NOT NULL,
  "sectionNumber" TEXT,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "parentId" TEXT,
  "order" INTEGER NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 0,
  "embedding" vector NOT NULL DEFAULT ARRAY[]::vector,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "document_sections_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- DOCUMENT FILES
-- ============================================

CREATE TABLE "document_files" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "storageUrl" TEXT,
  "fileHash" TEXT NOT NULL,
  "pageCount" INTEGER,
  "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "extractedText" TEXT,
  "processingError" TEXT,
  "processedAt" TIMESTAMP(3),
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "fileType" TEXT NOT NULL DEFAULT 'SOURCE',
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- DOCUMENT RELATIONS
-- ============================================

CREATE TABLE "document_relations" (
  "id" TEXT NOT NULL,
  "fromDocumentId" TEXT NOT NULL,
  "toDocumentId" TEXT NOT NULL,
  "relationType" "DocumentRelationType" NOT NULL,
  "description" TEXT,
  "affectedArticles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_relations_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- DOCUMENT METADATA
-- ============================================

CREATE TABLE "document_metadata" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "dataType" TEXT NOT NULL DEFAULT 'string',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "document_metadata_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX "document_versions_documentId_versionNumber_key" ON "document_versions"("documentId", "versionNumber");

CREATE UNIQUE INDEX "document_relations_fromDocumentId_toDocumentId_relationType_key" ON "document_relations"("fromDocumentId", "toDocumentId", "relationType");

CREATE UNIQUE INDEX "document_metadata_documentId_key_key" ON "document_metadata"("documentId", "key");

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Documents indexes
CREATE INDEX "documents_type_idx" ON "documents"("type");
CREATE INDEX "documents_status_idx" ON "documents"("status");
CREATE INDEX "documents_isActive_idx" ON "documents"("isActive");
CREATE INDEX "documents_hierarchyLevel_idx" ON "documents"("hierarchyLevel");
CREATE INDEX "documents_issueDate_idx" ON "documents"("issueDate");
CREATE INDEX "documents_publicationDate_idx" ON "documents"("publicationDate");
CREATE INDEX "documents_createdBy_idx" ON "documents"("createdBy");
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");
CREATE INDEX "documents_documentNumber_idx" ON "documents"("documentNumber");
CREATE INDEX "documents_scope_idx" ON "documents"("scope");
CREATE INDEX "documents_type_isActive_idx" ON "documents"("type", "isActive");
CREATE INDEX "documents_status_createdBy_idx" ON "documents"("status", "createdBy");

-- Document versions indexes
CREATE INDEX "document_versions_documentId_idx" ON "document_versions"("documentId");
CREATE INDEX "document_versions_createdAt_idx" ON "document_versions"("createdAt");
CREATE INDEX "document_versions_versionNumber_idx" ON "document_versions"("versionNumber");

-- Document sections indexes
CREATE INDEX "document_sections_documentId_idx" ON "document_sections"("documentId");
CREATE INDEX "document_sections_order_idx" ON "document_sections"("order");
CREATE INDEX "document_sections_parentId_idx" ON "document_sections"("parentId");
CREATE INDEX "document_sections_documentId_order_idx" ON "document_sections"("documentId", "order");

-- Document files indexes
CREATE INDEX "document_files_documentId_idx" ON "document_files"("documentId");
CREATE INDEX "document_files_processingStatus_idx" ON "document_files"("processingStatus");
CREATE INDEX "document_files_isPrimary_idx" ON "document_files"("isPrimary");
CREATE INDEX "document_files_uploadedBy_idx" ON "document_files"("uploadedBy");
CREATE INDEX "document_files_createdAt_idx" ON "document_files"("createdAt");

-- Document relations indexes
CREATE INDEX "document_relations_fromDocumentId_idx" ON "document_relations"("fromDocumentId");
CREATE INDEX "document_relations_toDocumentId_idx" ON "document_relations"("toDocumentId");
CREATE INDEX "document_relations_relationType_idx" ON "document_relations"("relationType");
CREATE INDEX "document_relations_createdBy_idx" ON "document_relations"("createdBy");

-- Document metadata indexes
CREATE INDEX "document_metadata_documentId_idx" ON "document_metadata"("documentId");
CREATE INDEX "document_metadata_key_idx" ON "document_metadata"("key");

-- ============================================
-- FOREIGN KEYS
-- ============================================

-- Documents foreign keys
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Document versions foreign keys
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Document sections foreign keys
ALTER TABLE "document_sections" ADD CONSTRAINT "document_sections_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_sections" ADD CONSTRAINT "document_sections_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "document_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Document files foreign keys
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Document relations foreign keys
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_fromDocumentId_fkey" FOREIGN KEY ("fromDocumentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_toDocumentId_fkey" FOREIGN KEY ("toDocumentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Document metadata foreign keys
ALTER TABLE "document_metadata" ADD CONSTRAINT "document_metadata_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VECTOR INDEXES (Optional, add after data insertion for better performance)
-- ============================================

-- Uncomment these after inserting documents for better vector search performance
-- CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX ON document_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
