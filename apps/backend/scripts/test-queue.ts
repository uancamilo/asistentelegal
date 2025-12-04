/**
 * Test Script: Enqueue a test job to document-processing queue
 *
 * Usage:
 *   1. Start Redis: docker run -d -p 6379:6379 redis:alpine
 *   2. Start backend: npm run start:dev
 *   3. Run this script: npx ts-node scripts/test-queue.ts
 *
 * This will enqueue a test job and you should see logs in the backend console.
 */

import { Queue } from 'bullmq';
import {
  DOCUMENT_PROCESSING_QUEUE,
  JOB_PDF_EXTRACTION,
  JOB_EMBEDDING_GENERATION,
} from '../src/shared/queue/queue.constants';

// Redis connection (same as in queue.module.ts)
const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

async function main() {
  console.log('Connecting to Redis:', REDIS_URL);

  // Parse Redis URL
  const url = new URL(REDIS_URL);
  const connection = {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
  };

  // Create queue instance
  const queue = new Queue(DOCUMENT_PROCESSING_QUEUE, { connection });

  console.log(`Connected to queue: ${DOCUMENT_PROCESSING_QUEUE}`);

  // Test job 1: PDF Extraction
  const pdfJob = await queue.add(
    JOB_PDF_EXTRACTION,
    {
      documentId: 'test-doc-001',
      sourceUrl: 'https://example.com/test.pdf',
      userId: 'test-user-001',
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    }
  );
  console.log(`Enqueued PDF extraction job: ${pdfJob.id}`);

  // Test job 2: Embedding Generation
  const embeddingJob = await queue.add(
    JOB_EMBEDDING_GENERATION,
    {
      documentId: 'test-doc-002',
      text: 'Este es un texto de prueba para generar embeddings.',
      userId: 'test-user-001',
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    }
  );
  console.log(`Enqueued embedding generation job: ${embeddingJob.id}`);

  // Get queue stats
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const completed = await queue.getCompletedCount();
  const failed = await queue.getFailedCount();

  console.log('\nQueue stats:');
  console.log(`  Waiting: ${waiting}`);
  console.log(`  Active: ${active}`);
  console.log(`  Completed: ${completed}`);
  console.log(`  Failed: ${failed}`);

  // Close connection
  await queue.close();
  console.log('\nQueue connection closed. Check backend logs for job processing.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
