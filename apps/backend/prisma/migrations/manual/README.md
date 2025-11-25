# Migration: Processing & Review Fields

**Date**: 2024-11-25
**Purpose**: Enable URL ingestion, processing status tracking, and human review workflow

## Files in this directory

| File | Description |
|------|-------------|
| `001_add_processing_fields.sql` | SQL migration to run against PostgreSQL |
| `schema_fragment.prisma` | Fragment to insert into schema.prisma |
| `prismaRepositoryPatch.diff` | Unified diff for PrismaDocument.repository.ts |
| `typescript_types_patch.md` | Instructions for updating TS types |
| `notes.md` | Deployment notes and verification steps |

## Quick Start

```bash
# 1. Backup
pg_dump -Fc $DATABASE_URL > backup.dump

# 2. Run migration
psql $DATABASE_URL -f 001_add_processing_fields.sql

# 3. Update schema.prisma (manual - insert fragment)

# 4. Regenerate Prisma client
npx prisma generate

# 5. Apply TS changes per typescript_types_patch.md

# 6. Apply repository patch
# (manual - review and apply prismaRepositoryPatch.diff)

# 7. Test
npm run test
```

## Changes Summary

### New Columns (all NULLABLE)
- `sourceUrl` - URL origin for imported documents
- `processingStatus` - Content processing state (enum ProcessingStatus)
- `embeddingStatus` - Embedding generation state (enum ProcessingStatus)
- `embeddingError` - Error message if embedding failed
- `reviewedBy` - User who reviewed the document
- `reviewedAt` - Review timestamp
- `rejectionReason` - Reason for rejection

### Bug Fixes
- `create()`: Now persists `embedding` field
- `update()`: Now persists `embedding` and `issuingEntity` fields

### New Indexes
- `documents_processingStatus_idx`
- `documents_embeddingStatus_idx`
- `documents_sourceUrl_idx` (partial, where NOT NULL)
- `documents_embedding_hnsw_idx` (HNSW for vector search)
