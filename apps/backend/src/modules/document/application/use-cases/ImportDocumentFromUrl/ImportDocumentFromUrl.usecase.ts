import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { DocumentStatus } from '../../../domain/entities/DocumentEnums';
import {
  ImportDocumentFromUrlDto,
  ImportDocumentFromUrlResponseDto,
} from './ImportDocumentFromUrl.dto';
import {
  DOCUMENT_PROCESSING_QUEUE,
  JOB_PDF_EXTRACTION,
} from '../../../../../shared/queue/queue.constants';

/**
 * ImportDocumentFromUrl Use Case
 *
 * Creates a document record and enqueues a background job to:
 * 1. Download the PDF from the provided URL
 * 2. Extract text from the PDF
 * 3. Generate embeddings for semantic search
 *
 * The document is created with:
 * - status: DRAFT
 * - processingStatus: PENDING
 * - embeddingStatus: PENDING
 *
 * The caller receives an immediate response with the document ID
 * and can poll for status updates.
 */
@Injectable()
export class ImportDocumentFromUrlUseCase {
  private readonly logger = new Logger(ImportDocumentFromUrlUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly documentQueue: Queue,
  ) {}

  async execute(
    dto: ImportDocumentFromUrlDto,
    userId: string,
  ): Promise<ImportDocumentFromUrlResponseDto> {
    this.logger.log(`Importing document from URL: ${dto.url}`);

    // Validate URL is accessible (basic check)
    this.validateUrl(dto.url);

    // Create document record with PENDING status
    const documentData = DocumentEntity.create({
      title: dto.title,
      documentNumber: dto.documentNumber,
      type: dto.type,
      scope: dto.scope,
      issuingEntity: dto.issuingEntity,
      summary: dto.summary,
      createdBy: userId,
      sourceUrl: dto.url,
      processingStatus: 'PENDING',
    });

    // Save document to database
    const document = await this.documentRepository.create(documentData);

    this.logger.log(`Created document ${document.id}, enqueueing PDF extraction job`);

    // Enqueue PDF extraction job
    const job = await this.documentQueue.add(
      JOB_PDF_EXTRACTION,
      {
        documentId: document.id,
        sourceUrl: dto.url,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    );

    this.logger.log(`Enqueued job ${job.id} for document ${document.id}`);

    return {
      id: document.id,
      title: document.title,
      type: document.type,
      status: DocumentStatus.DRAFT,
      processingStatus: 'PENDING',
      embeddingStatus: 'PENDING',
      sourceUrl: dto.url,
      message: 'Document import started. The PDF will be processed in the background.',
    };
  }

  /**
   * Basic URL validation
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }

      // Block localhost and private IPs in production
      const hostname = parsedUrl.hostname.toLowerCase();
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];

      if (blockedHosts.includes(hostname)) {
        throw new Error('URLs pointing to localhost are not allowed');
      }

      // Block private IP ranges
      if (this.isPrivateIP(hostname)) {
        throw new Error('URLs pointing to private IP addresses are not allowed');
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid URL')) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIP(hostname: string): boolean {
    // Check for private IP patterns
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/i,
      /^fe80:/i,
    ];

    return privatePatterns.some((pattern) => pattern.test(hostname));
  }
}
