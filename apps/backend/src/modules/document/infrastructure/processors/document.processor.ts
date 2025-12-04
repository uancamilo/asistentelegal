import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import axios, { AxiosError } from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

/**
 * Result type from pdf-parse getText()
 */
interface PdfTextResult {
  pages: Array<{ text: string; num: number }>;
  text: string;
  total: number;
}
import {
  DOCUMENT_PROCESSING_QUEUE,
  JOB_PDF_EXTRACTION,
  JOB_EMBEDDING_GENERATION,
} from '../../../../shared/queue/queue.constants';
import { DOCUMENT_REPOSITORY, DOCUMENT_CHUNK_REPOSITORY } from '../../domain/constants/tokens';
import { IDocumentRepository } from '../../domain/repositories/Document.repository.interface';
import { IDocumentChunkRepository } from '../../domain/repositories/DocumentChunk.repository.interface';
import { EmbeddingService } from '../../application/services/EmbeddingService';
import { chunkText } from '../../application/utils/chunkText';
import { ProcessingStatus } from '../../domain/entities/DocumentEnums';

/**
 * Job payload for PDF extraction
 */
export interface PdfExtractionJobData {
  documentId: string;
  sourceUrl: string;
  userId: string;
}

/**
 * Job payload for embedding generation
 */
export interface EmbeddingGenerationJobData {
  documentId: string;
  userId: string;
}

/**
 * DocumentProcessor
 *
 * BullMQ worker that processes document-related async jobs.
 * Handles two job types:
 * - pdf-extraction: Downloads PDF from URL and extracts text
 * - embedding-generation: Generates vector embeddings from text
 */
@Processor(DOCUMENT_PROCESSING_QUEUE)
export class DocumentProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    @Inject(DOCUMENT_CHUNK_REPOSITORY)
    private readonly documentChunkRepository: IDocumentChunkRepository,
    private readonly embeddingService: EmbeddingService,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly documentQueue: Queue,
  ) {
    super();
  }

  onModuleInit() {
    this.logger.log('DocumentProcessor initialized and ready to process jobs');
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log('Worker is ready and connected to Redis');
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} is now active`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  /**
   * Main job handler - routes to specific handlers based on job name
   */
  async process(job: Job<PdfExtractionJobData | EmbeddingGenerationJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case JOB_PDF_EXTRACTION:
          await this.handlePdfExtraction(job as Job<PdfExtractionJobData>);
          break;

        case JOB_EMBEDDING_GENERATION:
          await this.handleEmbeddingGeneration(job as Job<EmbeddingGenerationJobData>);
          break;

        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job ${job.id} failed with error: ${errorMessage}`);
      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Handler for PDF extraction jobs
   *
   * Flow:
   * 1. Download PDF from sourceUrl
   * 2. Extract text using pdf-parse
   * 3. Update document with extracted text (fullText)
   * 4. Update processingStatus to COMPLETED or FAILED
   * 5. Enqueue embedding-generation job (only if extraction succeeded)
   *
   * Error Handling:
   * - Download failure: processingStatus=FAILED, embeddingStatus=SKIPPED
   * - PDF parse failure: processingStatus=FAILED, embeddingStatus=SKIPPED
   * - No embedding job is enqueued on failure
   * - Document status remains DRAFT (for human review in Step 4)
   */
  private async handlePdfExtraction(job: Job<PdfExtractionJobData>): Promise<void> {
    const { documentId, sourceUrl, userId } = job.data;

    this.logger.log(`[PDF Extraction] ========================================`);
    this.logger.log(`[PDF Extraction] Starting job ${job.id} for document ${documentId}`);
    this.logger.log(`[PDF Extraction] Source URL: ${sourceUrl}`);
    this.logger.log(`[PDF Extraction] User ID: ${userId}`);

    // Step 1: Update status to PROCESSING
    try {
      await job.updateProgress(10);
      await this.documentRepository.update(documentId, {
        processingStatus: ProcessingStatus.PROCESSING,
      } as any);
      this.logger.log(`[PDF Extraction] Status updated to PROCESSING`);
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      this.logger.error(`[PDF Extraction] ERROR: Failed to update initial status: ${msg}`);
      // Continue anyway - this is not critical
    }

    // Step 2: Download PDF
    let pdfBuffer: Buffer;
    try {
      await job.updateProgress(20);
      this.logger.log('[PDF Extraction] Downloading PDF...');

      const response = await axios.get(sourceUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 second timeout
        maxContentLength: 50 * 1024 * 1024, // 50MB max
        headers: {
          'User-Agent': 'AsistenciaLegal-Bot/1.0',
        },
      });

      const contentType = response.headers['content-type'];
      if (!contentType?.includes('application/pdf')) {
        throw new Error(`Invalid content type: ${contentType}. Expected application/pdf`);
      }

      pdfBuffer = Buffer.from(response.data);
      this.logger.log(`[PDF Extraction] Downloaded ${pdfBuffer.length} bytes successfully`);

    } catch (downloadError) {
      // Download failed - set processingStatus=FAILED, embeddingStatus=SKIPPED
      const errorMessage = this.formatDownloadError(downloadError);
      this.logger.error(`[PDF Extraction] ERROR: Download failed - ${errorMessage}`);

      await this.markExtractionFailed(documentId, `Download failed: ${errorMessage}`);
      throw new Error(`PDF download failed: ${errorMessage}`);
    }

    // Step 3: Extract text from PDF
    let extractedText: string;
    try {
      await job.updateProgress(50);
      this.logger.log('[PDF Extraction] Extracting text from PDF...');

      const pdfParser = new PDFParse({ data: pdfBuffer });
      const pdfData: PdfTextResult = await pdfParser.getText();
      extractedText = pdfData.text?.trim() || '';

      // Clean up parser resources
      await pdfParser.destroy();

      if (!extractedText) {
        throw new Error('No text could be extracted from the PDF (empty result)');
      }

      this.logger.log(`[PDF Extraction] Extracted ${extractedText.length} characters from ${pdfData.total || 'unknown'} pages`);

    } catch (parseError) {
      // PDF parsing failed - set processingStatus=FAILED, embeddingStatus=SKIPPED
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      this.logger.error(`[PDF Extraction] ERROR: Text extraction failed - ${errorMessage}`);

      await this.markExtractionFailed(documentId, `Text extraction failed: ${errorMessage}`);
      throw new Error(`PDF text extraction failed: ${errorMessage}`);
    }

    // Step 4: Save extracted text to database
    // NOTE: Text is saved as-is, without validation or correction
    // Human review in Step 4 will validate and edit the text
    try {
      await job.updateProgress(80);
      this.logger.log('[PDF Extraction] Saving extracted text to database...');

      await this.documentRepository.update(documentId, {
        fullText: extractedText,
        processingStatus: ProcessingStatus.COMPLETED,
        embeddingStatus: ProcessingStatus.PENDING,
        embeddingError: null, // Clear any previous error
      } as any);

      this.logger.log(`[PDF Extraction] Text saved successfully (${extractedText.length} chars)`);

    } catch (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
      this.logger.error(`[PDF Extraction] ERROR: Failed to save text - ${errorMessage}`);

      await this.markExtractionFailed(documentId, `Database save failed: ${errorMessage}`);
      throw new Error(`Failed to save extracted text: ${errorMessage}`);
    }

    // Step 5: Enqueue embedding generation job
    try {
      await job.updateProgress(90);
      this.logger.log('[PDF Extraction] Enqueueing embedding generation job...');

      const embeddingJob = await this.documentQueue.add(
        JOB_EMBEDDING_GENERATION,
        {
          documentId,
          userId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );

      this.logger.log(`[PDF Extraction] Embedding job enqueued with ID: ${embeddingJob.id}`);

    } catch (queueError) {
      // Queue failure is not critical - text is already saved
      // Embedding can be retried manually later
      const errorMessage = queueError instanceof Error ? queueError.message : String(queueError);
      this.logger.error(`[PDF Extraction] WARNING: Failed to enqueue embedding job - ${errorMessage}`);
      this.logger.warn(`[PDF Extraction] Text extraction completed but embedding generation was not enqueued`);
      // Don't throw - extraction was successful
    }

    await job.updateProgress(100);
    this.logger.log(`[PDF Extraction] ========================================`);
    this.logger.log(`[PDF Extraction] Completed successfully for document ${documentId}`);
    this.logger.log(`[PDF Extraction] - Text length: ${extractedText.length} characters`);
    this.logger.log(`[PDF Extraction] - Status: processingStatus=COMPLETED, embeddingStatus=PENDING`);
    this.logger.log(`[PDF Extraction] - Document remains in DRAFT status for human review`);
  }

  /**
   * Helper: Format download error with detailed information
   */
  private formatDownloadError(error: unknown): string {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED') {
        return `Timeout after ${error.config?.timeout || 60000}ms`;
      }
      if (error.code === 'ENOTFOUND') {
        return `Host not found: ${error.config?.url}`;
      }
      if (error.response) {
        return `HTTP ${error.response.status}: ${error.response.statusText}`;
      }
      if (error.code) {
        return `Network error: ${error.code} - ${error.message}`;
      }
    }
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Helper: Mark extraction as failed with proper status updates
   * Sets processingStatus=FAILED and embeddingStatus=SKIPPED
   * No embedding job will be enqueued
   */
  private async markExtractionFailed(documentId: string, errorMessage: string): Promise<void> {
    try {
      await this.documentRepository.update(documentId, {
        processingStatus: ProcessingStatus.FAILED,
        embeddingStatus: ProcessingStatus.SKIPPED,
        embeddingError: errorMessage.substring(0, 500),
      } as any);
      this.logger.log(`[PDF Extraction] Document ${documentId} marked as FAILED (embedding SKIPPED)`);
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      this.logger.error(`[PDF Extraction] ERROR: Failed to update error status in database: ${msg}`);
    }
  }

  /**
   * Handler for embedding generation jobs
   *
   * Flow (updated for chunking):
   * 1. Get document from database
   * 2. Chunk the text into smaller pieces
   * 3. Delete existing chunks for this document
   * 4. Generate embeddings for each chunk via OpenAI (text-embedding-3-large)
   * 5. Save chunks with embeddings to database
   * 6. Update embeddingStatus to COMPLETED or FAILED
   *
   * Error Handling:
   * - OpenAI failure: embeddingStatus=FAILED, extracted text is preserved
   * - Database failure: embeddingStatus=FAILED
   * - Document status remains DRAFT (for human review)
   *
   * NOTE: On embedding failure, the extracted text is NOT deleted.
   * The document can still be reviewed and the embedding can be regenerated later.
   */
  private async handleEmbeddingGeneration(job: Job<EmbeddingGenerationJobData>): Promise<void> {
    const { documentId } = job.data;

    this.logger.log(`[Embedding] ========================================`);
    this.logger.log(`[Embedding] Starting job ${job.id} for document ${documentId}`);

    // Step 1: Get document from database
    let document: Awaited<ReturnType<typeof this.documentRepository.findById>>;
    try {
      await job.updateProgress(5);
      document = await this.documentRepository.findById(documentId);

      if (!document) {
        this.logger.error(`[Embedding] ERROR: Document ${documentId} not found in database`);
        throw new Error(`Document ${documentId} not found`);
      }

      this.logger.log(`[Embedding] Document found: "${document.title}"`);
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      this.logger.error(`[Embedding] ERROR: Failed to fetch document - ${errorMessage}`);
      throw fetchError;
    }

    // Step 2: Update status to PROCESSING
    try {
      await job.updateProgress(10);
      await this.documentRepository.update(documentId, {
        embeddingStatus: ProcessingStatus.PROCESSING,
      } as any);
      this.logger.log(`[Embedding] Status updated to PROCESSING`);
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      this.logger.error(`[Embedding] ERROR: Failed to update initial status: ${msg}`);
      // Continue anyway - this is not critical
    }

    // Step 3: Prepare text for chunking
    await job.updateProgress(15);
    const textParts: string[] = [];

    // Include title and summary as context prefix for each chunk
    const contextPrefix = [
      document.title ? `Título: ${document.title}` : '',
      document.summary ? `Resumen: ${document.summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (document.fullText) {
      textParts.push(document.fullText);
    }

    const fullTextForChunking = textParts.join('\n\n');

    if (!fullTextForChunking.trim()) {
      const errorMessage = 'No text available for embedding generation (fullText is empty)';
      this.logger.error(`[Embedding] ERROR: ${errorMessage}`);
      await this.markEmbeddingFailed(documentId, errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log(`[Embedding] Full text length: ${fullTextForChunking.length} characters`);

    // Step 4: Chunk the text
    await job.updateProgress(20);
    this.logger.log('[Embedding] Chunking text...');

    const chunks = chunkText(fullTextForChunking, {
      targetSize: 1200,
      minSize: 500,
      maxSize: 1500,
      overlap: 100,
    });

    if (chunks.length === 0) {
      const errorMessage = 'Text chunking produced no chunks';
      this.logger.error(`[Embedding] ERROR: ${errorMessage}`);
      await this.markEmbeddingFailed(documentId, errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log(`[Embedding] Created ${chunks.length} chunks`);

    // Step 5: Delete existing chunks for this document
    try {
      await job.updateProgress(25);
      const deletedCount = await this.documentChunkRepository.deleteChunks(documentId);
      if (deletedCount > 0) {
        this.logger.log(`[Embedding] Deleted ${deletedCount} existing chunks`);
      }
    } catch (deleteError) {
      const msg = deleteError instanceof Error ? deleteError.message : String(deleteError);
      this.logger.warn(`[Embedding] WARNING: Failed to delete existing chunks: ${msg}`);
      // Continue anyway - we'll overwrite
    }

    // Step 6: Generate embeddings for each chunk
    this.logger.log('[Embedding] Generating embeddings for chunks via OpenAI...');

    const chunksWithEmbeddings: Array<{
      chunkIndex: number;
      content: string;
      embedding: number[];
      articleRef?: string;
    }> = [];

    try {
      // Prepare chunk texts with context prefix
      const chunkTexts = chunks.map((chunk) => {
        const textWithContext = contextPrefix
          ? `${contextPrefix}\n\n${chunk.content}`
          : chunk.content;
        return textWithContext;
      });

      // Generate embeddings in batch
      await job.updateProgress(30);
      const embeddings = await this.embeddingService.generateEmbeddings(chunkTexts);

      // Combine chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        if (chunk && embedding && embedding.length > 0) {
          chunksWithEmbeddings.push({
            chunkIndex: chunk.index,
            content: chunk.content,
            embedding: embedding,
            articleRef: chunk.articleRef,
          });
        } else {
          this.logger.warn(`[Embedding] WARNING: No embedding generated for chunk ${i}`);
        }

        // Update progress (30% to 80% for embedding generation)
        const progress = 30 + Math.floor((i / chunks.length) * 50);
        await job.updateProgress(progress);
      }

      this.logger.log(
        `[Embedding] Generated ${chunksWithEmbeddings.length}/${chunks.length} embeddings ` +
          `(${this.embeddingService.getEmbeddingDimensions()} dimensions each)`,
      );

      if (chunksWithEmbeddings.length === 0) {
        throw new Error('No embeddings were generated for any chunks');
      }
    } catch (openAIError) {
      const errorMessage = openAIError instanceof Error ? openAIError.message : String(openAIError);
      this.logger.error(`[Embedding] ERROR: OpenAI API failed - ${errorMessage}`);

      await this.markEmbeddingFailed(documentId, `OpenAI API error: ${errorMessage}`);
      throw new Error(`Embedding generation failed: ${errorMessage}`);
    }

    // Step 7: Save chunks with embeddings to database
    try {
      await job.updateProgress(85);
      this.logger.log('[Embedding] Saving chunks with embeddings to database...');

      const savedChunks = await this.documentChunkRepository.createChunks(
        documentId,
        chunksWithEmbeddings,
      );

      this.logger.log(`[Embedding] Saved ${savedChunks.length} chunks to database`);
    } catch (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
      this.logger.error(`[Embedding] ERROR: Failed to save chunks - ${errorMessage}`);

      await this.markEmbeddingFailed(documentId, `Database save failed: ${errorMessage}`);
      throw new Error(`Failed to save chunks: ${errorMessage}`);
    }

    // Step 8: Update document embedding status
    try {
      await job.updateProgress(95);
      await this.documentRepository.update(documentId, {
        embeddingStatus: ProcessingStatus.COMPLETED,
        embeddingError: null,
      } as any);
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      this.logger.error(`[Embedding] ERROR: Failed to update final status: ${msg}`);
      // Don't throw - chunks are saved, just log the error
    }

    await job.updateProgress(100);
    this.logger.log(`[Embedding] ========================================`);
    this.logger.log(`[Embedding] Completed successfully for document ${documentId}`);
    this.logger.log(`[Embedding] - Chunks created: ${chunksWithEmbeddings.length}`);
    this.logger.log(`[Embedding] - Embedding dimensions: ${this.embeddingService.getEmbeddingDimensions()}`);
    this.logger.log(`[Embedding] - Model: ${this.embeddingService.getModel()}`);
    this.logger.log(`[Embedding] - Status: embeddingStatus=COMPLETED`);
    this.logger.log(`[Embedding] - Document remains in DRAFT status for human review`);
  }

  /**
   * Helper: Mark embedding generation as failed
   * Sets embeddingStatus=FAILED but preserves extracted text
   */
  private async markEmbeddingFailed(documentId: string, errorMessage: string): Promise<void> {
    try {
      await this.documentRepository.update(documentId, {
        embeddingStatus: ProcessingStatus.FAILED,
        embeddingError: errorMessage.substring(0, 500),
        // NOTE: fullText is NOT cleared - preserving extracted text for manual retry
      } as any);
      this.logger.log(`[Embedding] Document ${documentId} marked as FAILED (text preserved)`);
    } catch (updateError) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      this.logger.error(`[Embedding] ERROR: Failed to update error status in database: ${msg}`);
    }
  }
}
