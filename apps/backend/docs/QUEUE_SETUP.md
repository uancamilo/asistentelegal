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

## Next Steps (Step 2)

1. Implement actual PDF download logic in `handlePdfExtraction()`
2. Implement text extraction using `pdf-parse`
3. Implement embedding generation using OpenAI API
4. Create `ImportDocumentFromUrlUseCase` to enqueue jobs
5. Add endpoint `POST /documents/import-url`
6. Update document status (`processingStatus`, `embeddingStatus`)
