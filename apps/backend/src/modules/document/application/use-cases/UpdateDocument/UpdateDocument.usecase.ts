import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { UpdateDocumentDto } from '../../dtos/Document.dto';
import { ProcessingStatus } from '../../../domain/entities/DocumentEnums';

/**
 * Use Case: Update Document
 *
 * Business logic:
 * 1. Find existing document
 * 2. Validate document number uniqueness (if changed)
 * 3. Update document content using domain logic
 * 4. Mark embedding as pending if fullText changed (will be regenerated via queue)
 * 5. Persist changes
 * 6. Return updated document
 *
 * Note: Embedding regeneration is now handled asynchronously via the document processor.
 * When fullText changes, embeddingStatus is set to PENDING and chunks will be regenerated
 * when the document is re-processed.
 *
 * Authorization: EDITOR, ADMIN, SUPER_ADMIN (creator or higher role)
 */
@Injectable()
export class UpdateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(
    documentId: string,
    dto: UpdateDocumentDto,
    userId: string,
  ): Promise<DocumentEntity> {
    // 1. Find existing document
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    // 2. Check if document number changed and is unique
    if (dto.documentNumber && dto.documentNumber !== document.documentNumber) {
      const existing = await this.documentRepository.findByDocumentNumber(dto.documentNumber);
      if (existing && existing.id !== documentId) {
        throw new ConflictException(
          `Document with number "${dto.documentNumber}" already exists`,
        );
      }
    }

    // 3. Update document content using domain logic
    document.updateContent({
      title: dto.title,
      documentNumber: dto.documentNumber,
      issuingEntity: dto.issuingEntity,
      summary: dto.summary,
      fullText: dto.fullText,
      keywords: dto.keywords,
      updatedBy: userId,
    });

    // 4. Mark embedding as pending if fullText changed (will be regenerated via queue)
    const needsEmbeddingRegeneration = dto.fullText !== undefined;

    // 5. Persist changes
    const updated = await this.documentRepository.update(documentId, {
      ...document,
      // Mark embedding as pending if content changed - chunks will be regenerated
      ...(needsEmbeddingRegeneration && {
        embeddingStatus: ProcessingStatus.PENDING,
      }),
    });

    return updated;
  }
}
