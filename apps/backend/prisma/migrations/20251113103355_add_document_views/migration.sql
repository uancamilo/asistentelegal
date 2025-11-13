-- Migration: Add Document Views Table
-- Tabla para trackear todas las visitas a documentos

-- Create document_views table
CREATE TABLE "document_views" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "referer" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_views_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX "document_views_documentId_idx" ON "document_views"("documentId");
CREATE INDEX "document_views_documentId_viewedAt_idx" ON "document_views"("documentId", "viewedAt");
CREATE INDEX "document_views_userId_idx" ON "document_views"("userId");
CREATE INDEX "document_views_viewedAt_idx" ON "document_views"("viewedAt");

-- Add foreign keys
ALTER TABLE "document_views" ADD CONSTRAINT "document_views_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_views" ADD CONSTRAINT "document_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
