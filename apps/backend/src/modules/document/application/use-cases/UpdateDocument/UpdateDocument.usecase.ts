import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { UpdateDocumentDto } from '../../dtos/Document.dto';
import { OpenAIService } from '../../../../../shared/openai/OpenAI.service';

/**
 * Use Case: Update Document
 *
 * Business logic:
 * 1. Find existing document
 * 2. Validate document number uniqueness (if changed)
 * 3. Update document content using domain logic
 * 4. Regenerate embedding if fullText changed
 * 5. Persist changes
 * 6. Return updated document
 *
 * Authorization: EDITOR, ADMIN, SUPER_ADMIN (creator or higher role)
 */
@Injectable()
export class UpdateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    private readonly openAIService: OpenAIService,
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

    // 4. Regenerate embedding if fullText changed
    if (dto.fullText !== undefined) {
      try {
        const textForEmbedding = `${document.title}\n\n${document.summary || ''}\n\n${document.fullText?.substring(0, 2000) || ''}`;
        const embedding = await this.openAIService.generateEmbedding(textForEmbedding);
        document.setEmbedding(embedding);
      } catch (error) {
        // Embedding regeneration failed, continue without updating it
      }
    }

    // 5. Persist changes
    const updated = await this.documentRepository.update(documentId, document);

    return updated;
  }
}
