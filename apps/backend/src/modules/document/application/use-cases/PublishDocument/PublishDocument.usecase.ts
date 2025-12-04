import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { ProcessingStatus } from '../../../domain/entities/DocumentEnums';
import {
  DOCUMENT_PROCESSING_QUEUE,
  JOB_EMBEDDING_GENERATION,
} from '../../../../../shared/queue/queue.constants';

/**
 * Use Case: Publish Document
 *
 * Business logic:
 * 1. Find document
 * 2. Validate document can be published (has fullText)
 * 3. Call domain method to publish
 * 4. If embeddings are pending, enqueue embedding generation job
 * 5. Persist changes
 * 6. Return published document
 *
 * IMPORTANT: This use case now handles automatic embedding generation
 * for documents created manually (not via import-url).
 *
 * Authorization: EDITOR, ADMIN, SUPER_ADMIN
 */
@Injectable()
export class PublishDocumentUseCase {
  private readonly logger = new Logger(PublishDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly documentQueue: Queue,
  ) {}

  async execute(documentId: string, userId: string): Promise<DocumentEntity> {
    this.logger.log(`[PublishDocument] Starting publish for document: ${documentId}`);

    // 1. Find document
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    // 2. Validate and publish using domain logic
    try {
      document.publish(userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(errorMessage);
    }

    // 3. Persist changes (publish the document)
    const published = await this.documentRepository.update(documentId, document);

    // 4. Check if embeddings need to be generated
    // This handles documents created manually (not via import-url)
    const needsEmbeddings =
      document.embeddingStatus === ProcessingStatus.PENDING ||
      document.embeddingStatus === 'PENDING';

    if (needsEmbeddings && document.fullText && document.fullText.length > 0) {
      this.logger.log(`[PublishDocument] Document needs embeddings, enqueueing job...`);

      try {
        const job = await this.documentQueue.add(
          JOB_EMBEDDING_GENERATION,
          {
            documentId: document.id,
            userId,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { age: 24 * 3600 },
            removeOnFail: { age: 7 * 24 * 3600 },
          },
        );

        this.logger.log(`[PublishDocument] Embedding job enqueued: ${job.id}`);
      } catch (queueError) {
        // Log error but don't fail the publish - embeddings can be generated later
        const errorMsg = queueError instanceof Error ? queueError.message : String(queueError);
        this.logger.warn(`[PublishDocument] Failed to enqueue embedding job: ${errorMsg}`);
        this.logger.warn(`[PublishDocument] Document published but embeddings not generated. Manual generation may be needed.`);
      }
    } else if (needsEmbeddings) {
      this.logger.warn(`[PublishDocument] Document needs embeddings but has no fullText`);
    }

    this.logger.log(`[PublishDocument] Document ${documentId} published successfully`);

    return published;
  }

  /**
   * Archive document (unpublish and mark as archived)
   */
  async archive(documentId: string, userId: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    try {
      document.archive(userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(errorMessage);
    }

    const archived = await this.documentRepository.update(documentId, document);

    return archived;
  }
}
