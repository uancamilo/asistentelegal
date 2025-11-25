import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import axios from 'axios';
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
import { DOCUMENT_REPOSITORY } from '../../domain/constants/tokens';
import { IDocumentRepository } from '../../domain/repositories/Document.repository.interface';
import { OpenAIService } from '../../../../shared/openai/OpenAI.service';

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
    private readonly openAIService: OpenAIService,
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
   * 1. Download PDF from sourceUrl
   * 2. Extract text using pdf-parse
   * 3. Update document with extracted text
   * 4. Update processingStatus to COMPLETED or FAILED
   * 5. Enqueue embedding-generation job
   */
  private async handlePdfExtraction(job: Job<PdfExtractionJobData>): Promise<void> {
    const { documentId, sourceUrl, userId } = job.data;

    this.logger.log(`[PDF Extraction] Starting for document ${documentId}`);
    this.logger.log(`[PDF Extraction] Source URL: ${sourceUrl}`);

    try {
      // Step 1: Update status to PROCESSING
      await job.updateProgress(10);
      await this.documentRepository.update(documentId, {
        processingStatus: 'PROCESSING',
      } as any);

      // Step 2: Download PDF
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

      const pdfBuffer = Buffer.from(response.data);
      this.logger.log(`[PDF Extraction] Downloaded ${pdfBuffer.length} bytes`);

      // Step 3: Extract text from PDF
      await job.updateProgress(50);
      this.logger.log('[PDF Extraction] Extracting text...');

      const pdfParser = new PDFParse({ data: pdfBuffer });
      const pdfData: PdfTextResult = await pdfParser.getText();
      const extractedText = pdfData.text?.trim() || '';

      // Clean up parser resources
      await pdfParser.destroy();

      if (!extractedText) {
        throw new Error('No text could be extracted from the PDF');
      }

      this.logger.log(`[PDF Extraction] Extracted ${extractedText.length} characters`);

      // Step 4: Update document with extracted text
      await job.updateProgress(80);
      this.logger.log('[PDF Extraction] Saving to database...');

      await this.documentRepository.update(documentId, {
        fullText: extractedText,
        processingStatus: 'COMPLETED',
        embeddingStatus: 'PENDING',
      } as any);

      // Step 5: Enqueue embedding generation job
      await job.updateProgress(90);
      this.logger.log('[PDF Extraction] Enqueueing embedding generation...');

      await this.documentQueue.add(
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

      await job.updateProgress(100);
      this.logger.log(`[PDF Extraction] Completed for document ${documentId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[PDF Extraction] Failed: ${errorMessage}`);

      // Update document with error status
      try {
        await this.documentRepository.update(documentId, {
          processingStatus: 'FAILED',
          embeddingError: errorMessage.substring(0, 500),
        } as any);
      } catch (updateError) {
        const updateErrorMessage = updateError instanceof Error ? updateError.message : String(updateError);
        this.logger.error(`[PDF Extraction] Failed to update error status: ${updateErrorMessage}`);
      }

      throw error;
    }
  }

  /**
   * Handler for embedding generation jobs
   *
   * 1. Get document from database
   * 2. Prepare text for embedding (title + summary + fullText)
   * 3. Call OpenAI embedding API
   * 4. Update document with embedding vector
   * 5. Update embeddingStatus to COMPLETED or FAILED
   */
  private async handleEmbeddingGeneration(job: Job<EmbeddingGenerationJobData>): Promise<void> {
    const { documentId } = job.data;

    this.logger.log(`[Embedding Generation] Starting for document ${documentId}`);

    try {
      // Step 1: Get document from database
      await job.updateProgress(10);
      const document = await this.documentRepository.findById(documentId);

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Step 2: Update status to PROCESSING
      await job.updateProgress(20);
      await this.documentRepository.update(documentId, {
        embeddingStatus: 'PROCESSING',
      } as any);

      // Step 3: Prepare text for embedding
      await job.updateProgress(30);
      const textParts: string[] = [];

      if (document.title) {
        textParts.push(document.title);
      }
      if (document.summary) {
        textParts.push(document.summary);
      }
      if (document.fullText) {
        // Limit to first 8000 characters for embedding
        textParts.push(document.fullText.substring(0, 8000));
      }

      const textForEmbedding = textParts.join('\n\n');

      if (!textForEmbedding.trim()) {
        throw new Error('No text available for embedding generation');
      }

      this.logger.log(`[Embedding Generation] Text length: ${textForEmbedding.length} characters`);

      // Step 4: Generate embedding via OpenAI
      await job.updateProgress(50);
      this.logger.log('[Embedding Generation] Calling OpenAI API...');

      const embedding = await this.openAIService.generateEmbedding(textForEmbedding);

      if (!embedding || embedding.length === 0) {
        throw new Error('OpenAI returned empty embedding');
      }

      this.logger.log(`[Embedding Generation] Generated embedding with ${embedding.length} dimensions`);

      // Step 5: Update document with embedding
      await job.updateProgress(80);
      this.logger.log('[Embedding Generation] Saving embedding to database...');

      await this.documentRepository.update(documentId, {
        embedding,
        embeddingStatus: 'COMPLETED',
        embeddingError: null,
      } as any);

      await job.updateProgress(100);
      this.logger.log(`[Embedding Generation] Completed for document ${documentId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Embedding Generation] Failed: ${errorMessage}`);

      // Update document with error status
      try {
        await this.documentRepository.update(documentId, {
          embeddingStatus: 'FAILED',
          embeddingError: errorMessage.substring(0, 500),
        } as any);
      } catch (updateError) {
        const updateErrorMessage = updateError instanceof Error ? updateError.message : String(updateError);
        this.logger.error(`[Embedding Generation] Failed to update error status: ${updateErrorMessage}`);
      }

      throw error;
    }
  }
}
