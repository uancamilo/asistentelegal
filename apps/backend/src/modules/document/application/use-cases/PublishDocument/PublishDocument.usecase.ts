import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';

/**
 * Use Case: Publish Document
 *
 * Business logic:
 * 1. Find document
 * 2. Validate document can be published (has fullText)
 * 3. Call domain method to publish
 * 4. Persist changes
 * 5. Return published document
 *
 * Authorization: EDITOR, ADMIN, SUPER_ADMIN
 */
@Injectable()
export class PublishDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(documentId: string, userId: string): Promise<DocumentEntity> {
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

    // 3. Persist changes
    const published = await this.documentRepository.update(documentId, document);

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
