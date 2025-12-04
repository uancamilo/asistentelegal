# Document Processing Queue Setup

## Overview

This document describes the BullMQ-based async job queue for document processing.

## Architecture

```
┌─────────────────┐     ┌───────────────┐     ┌─────────────────────┐
│   Controller    │────▶│  Redis Queue  │────▶│  DocumentProcessor  │
│  (enqueue job)  │     │   (BullMQ)    │     │     (worker)        │
└─────────────────┘     └───────────────┘     └─────────────────────┘
                                                      │
                                              ┌───────┴───────┐
                                              │               │
                                        ┌─────▼─────┐   ┌─────▼─────┐
                                        │    PDF    │   │ Embedding │
                                        │Extraction │   │Generation │
                                        └───────────┘   └───────────┘
```

## Components

### 1. QueueModule (`src/shared/queue/queue.module.ts`)
- Configures BullMQ with Redis connection from `REDIS_URL`
- Registers the `document-processing` queue
- Exports `BullModule` for use in feature modules

### 2. Queue Constants (`src/shared/queue/queue.constants.ts`)
- `DOCUMENT_PROCESSING_QUEUE`: Queue name
- `JOB_PDF_EXTRACTION`: Job type for PDF extraction
- `JOB_EMBEDDING_GENERATION`: Job type for embedding generation

### 3. DocumentProcessor (`src/modules/document/infrastructure/processors/document.processor.ts`)
- BullMQ worker that processes jobs from the queue
- Handles two job types:
  - `pdf-extraction`: Downloads PDF and extracts text
  - `embedding-generation`: Generates vector embeddings

## Setup

### 1. Install Redis

**Option A: Docker (recommended for development)**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

**Option B: Local installation**
```bash
# macOS
brew install redis && brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server && sudo systemctl start redis
```

**Option C: Cloud Redis (production)**
- [Upstash](https://upstash.com/) - Serverless Redis
- [Redis Cloud](https://redis.com/cloud/) - Managed Redis
- AWS ElastiCache

### 2. Configure Environment

Add to `.env`:
```bash
REDIS_URL=redis://localhost:6379
```

For cloud Redis with TLS:
```bash
REDIS_URL=rediss://default:password@host:port
```

### 3. Start Backend

```bash
npm run start:dev
```

You should see logs like:
```
[Nest] LOG [DocumentProcessor] Processing job xxx of type pdf-extraction
```

## Testing

### Manual Test Script

```bash
# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Start backend in one terminal
npm run start:dev

# Run test script in another terminal
npx ts-node scripts/test-queue.ts
```

Expected output:
```
Connecting to Redis: redis://localhost:6379
Connected to queue: document-processing
Enqueued PDF extraction job: 1
Enqueued embedding generation job: 2
Queue stats:
  Waiting: 2
  Active: 0
  Completed: 0
  Failed: 0
```

### Via cURL (after endpoint is implemented)

```bash
# This endpoint will be implemented in Step 2
curl -X POST http://localhost:8080/api/documents/import-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "url": "https://example.com/document.pdf",
    "type": "LEY_ORDINARIA",
    "issuingEntity": "Congreso de la República"
  }'
```

## Job Data Structures

### PdfExtractionJobData
```typescript
interface PdfExtractionJobData {
  documentId: string;  // Document ID in database
  sourceUrl: string;   // URL to download PDF from
  userId: string;      // User who initiated the import
}
```

### EmbeddingGenerationJobData
```typescript
interface EmbeddingGenerationJobData {
  documentId: string;  // Document ID in database
  text: string;        // Text to generate embedding from
  userId: string;      // User who initiated the generation
}
```

## Monitoring

### BullMQ Dashboard (optional)

Install [Bull Board](https://github.com/felixmosh/bull-board):

```bash
npm install @bull-board/express @bull-board/api
```

Then add to your app module:

```typescript
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: DOCUMENT_PROCESSING_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
})
```

Access dashboard at: `http://localhost:8080/queues`

### Redis CLI

```bash
# Check queue length
redis-cli LLEN bull:document-processing:wait

# View all keys
redis-cli KEYS "bull:document-processing:*"
```

## Error Handling & Status Management (Step 3)

### Processing Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Waiting in queue |
| `PROCESSING` | Currently being processed |
| `COMPLETED` | Successfully processed |
| `FAILED` | Processing failed (see `embeddingError`) |
| `SKIPPED` | Skipped due to prior error |
| `MANUAL` | Manual entry (no async processing) |

### Error Scenarios & Status Updates

#### 1. PDF Download Failure
```
┌─────────────────────────────────────────────────┐
│ Cause: Network error, invalid URL, 404, timeout │
│                                                 │
│ processingStatus = FAILED                       │
│ embeddingStatus  = SKIPPED                      │
│ embeddingError   = "Download failed: <reason>"  │
│ fullText         = null                         │
│ status           = DRAFT (unchanged)            │
└─────────────────────────────────────────────────┘
```

#### 2. PDF Parse Failure
```
┌─────────────────────────────────────────────────┐
│ Cause: Invalid PDF, corrupt file, no text       │
│                                                 │
│ processingStatus = FAILED                       │
│ embeddingStatus  = SKIPPED                      │
│ embeddingError   = "Text extraction failed:..." │
│ fullText         = null                         │
│ status           = DRAFT (unchanged)            │
└─────────────────────────────────────────────────┘
```

#### 3. OpenAI Embedding Failure
```
┌─────────────────────────────────────────────────┐
│ Cause: API error, rate limit, invalid response  │
│                                                 │
│ processingStatus = COMPLETED (text was saved)   │
│ embeddingStatus  = FAILED                       │
│ embeddingError   = "OpenAI API error: <reason>" │
│ fullText         = <extracted text preserved>   │
│ status           = DRAFT (unchanged)            │
└─────────────────────────────────────────────────┘
```

#### 4. Success Scenario
```
┌─────────────────────────────────────────────────┐
│ processingStatus = COMPLETED                    │
│ embeddingStatus  = COMPLETED                    │
│ embeddingError   = null                         │
│ fullText         = <extracted text>             │
│ chunks           = N chunks with embeddings     │
│ status           = DRAFT (awaiting review)      │
└─────────────────────────────────────────────────┘
```

## Chunking & Embeddings (Step 6)

### Overview

Documents are processed using a chunking strategy for granular embeddings:

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Full Text   │────▶│   Chunking    │────▶│  Embeddings   │
│  (extracted)  │     │ (1000-1500ch) │     │ (per chunk)   │
└───────────────┘     └───────────────┘     └───────────────┘
                             │
                             ▼
                      ┌─────────────────┐
                      │ DocumentChunk[] │
                      │  - chunkIndex   │
                      │  - content      │
                      │  - embedding    │
                      └─────────────────┘
```

### Chunking Strategy

| Parameter | Value | Description |
|-----------|-------|-------------|
| targetSize | 1200 | Target characters per chunk |
| minSize | 500 | Minimum chunk size |
| maxSize | 1500 | Maximum chunk size |
| overlap | 100 | Character overlap between chunks |

**Break Point Priority:**
1. Paragraph break (`\n\n`)
2. Line break (`\n`)
3. Sentence end (`.`, `!`, `?`)
4. Semicolon/colon (`;`, `:`)
5. Comma (`,`)
6. Any whitespace

### Embedding Model

- **Model**: `text-embedding-3-small` (official system model)
- **Dimensions**: 1536
- **Batch Size**: 100 texts per API call
- **Cost**: More cost-effective than text-embedding-3-large

### Database Schema

```sql
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunkIndex INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- text-embedding-3-small
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(documentId, chunkIndex)
);

-- Vector index for semantic search
CREATE INDEX document_chunks_embedding_idx
ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

### Processing Flow

1. **PDF Extraction** → Extract full text from PDF
2. **Chunking** → Split text into semantic chunks (chunkText utility)
3. **Delete Old Chunks** → Remove any existing chunks for document
4. **Generate Embeddings** → Batch call to OpenAI for all chunks
5. **Save Chunks** → Store chunks with embeddings in database
6. **Update Status** → Set embeddingStatus = COMPLETED

### Context Injection

Each chunk embedding includes document context:

```
Título: <document title>
Resumen: <document summary>

<chunk content>
```

This improves semantic search relevance by providing context.

### Log Examples (Chunking)

**Successful chunking:**
```
[Embedding] ========================================
[Embedding] Starting job 26 for document cmif...
[Embedding] Document found: "Ley de Ejemplo"
[Embedding] Full text length: 45000 characters
[Embedding] Chunking text...
[Embedding] Created 38 chunks
[Embedding] Deleted 0 existing chunks
[Embedding] Generating embeddings for chunks via OpenAI...
[Embedding] Processing embedding batch 1/1 (38 texts)
[Embedding] Generated 38/38 embeddings (1536 dimensions each)
[Embedding] Saving chunks with embeddings to database...
[Embedding] Saved 38 chunks to database
[Embedding] ========================================
[Embedding] Completed successfully for document cmif...
[Embedding] - Chunks created: 38
[Embedding] - Embedding dimensions: 1536
[Embedding] - Model: text-embedding-3-small
[Embedding] - Status: embeddingStatus=COMPLETED
```

### API Response (DocumentResponseDto)

```json
{
  "id": "cmif...",
  "title": "Ley de Ejemplo",
  "status": "DRAFT",
  "processingStatus": "COMPLETED",
  "embeddingStatus": "COMPLETED",
  "chunksCount": 38
}
```

### Human Review Workflow (Step 4 - Not Yet Implemented)

Documents remain in `status = DRAFT` until human review:

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    DRAFT      │───▶│   IN_REVIEW   │───▶│   PUBLISHED   │
│ (processing)  │    │ (human edits) │    │  (approved)   │
└───────────────┘    └───────────────┘    └───────────────┘
                            │
                            ▼
                     ┌───────────────┐
                     │   REJECTED    │
                     │ (with reason) │
                     └───────────────┘
```

**Review Fields (prepared for Step 4):**
- `reviewedBy`: User ID who reviewed
- `reviewedAt`: Timestamp of review
- `rejectionReason`: If rejected, why

### Frontend Status Display

The frontend can display processing status to users:

| processingStatus | embeddingStatus | UI Message |
|------------------|-----------------|------------|
| PENDING | PENDING | "En cola..." |
| PROCESSING | PENDING | "Extrayendo texto..." |
| COMPLETED | PROCESSING | "Generando embeddings..." |
| COMPLETED | COMPLETED | "Procesado correctamente" |
| FAILED | SKIPPED | "Error en extracción" |
| COMPLETED | FAILED | "Error en embeddings" |

### Log Examples

**Successful processing:**
```
[PDF Extraction] ========================================
[PDF Extraction] Starting job 25 for document cmif...
[PDF Extraction] Source URL: https://example.com/doc.pdf
[PDF Extraction] Downloaded 50000 bytes successfully
[PDF Extraction] Extracted 15000 characters from 10 pages
[PDF Extraction] Text saved successfully (15000 chars)
[PDF Extraction] Embedding job enqueued with ID: 26
[PDF Extraction] ========================================
[PDF Extraction] Completed successfully for document cmif...

[Embedding] ========================================
[Embedding] Starting job 26 for document cmif...
[Embedding] Document found: "Ley de Ejemplo"
[Embedding] Prepared text for embedding: 8000 characters
[Embedding] Generated embedding with 1536 dimensions
[Embedding] Embedding saved successfully
[Embedding] ========================================
[Embedding] Completed successfully for document cmif...
```

**Failed processing:**
```
[PDF Extraction] ========================================
[PDF Extraction] Starting job 27 for document cmix...
[PDF Extraction] Source URL: https://invalid-url.com/doc.pdf
[PDF Extraction] ERROR: Download failed - Host not found
[PDF Extraction] Document cmix... marked as FAILED (embedding SKIPPED)
```

## Next Steps (Step 4 - Human Review)

1. Create `ReviewDocumentUseCase` for human review workflow
2. Add endpoint `POST /documents/:id/review` with:
   - `action: 'approve' | 'reject'`
   - `rejectionReason?: string` (if rejected)
   - `editedFullText?: string` (optional corrections)
3. Update document status from DRAFT → IN_REVIEW → PUBLISHED
4. Add frontend UI for document review queue
5. Regenerate embeddings if text was manually edited
