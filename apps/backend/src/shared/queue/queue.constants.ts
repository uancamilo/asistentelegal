/**
 * Queue Constants
 *
 * Centralized constants for BullMQ queue names and job types.
 * Following project convention of using string constants for DI tokens.
 */

// Queue Names
export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';

// Job Names
export const JOB_PDF_EXTRACTION = 'pdf-extraction';
export const JOB_EMBEDDING_GENERATION = 'embedding-generation';

// Job Options Defaults
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000,    // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};
