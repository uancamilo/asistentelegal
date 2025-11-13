import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { CreateDocumentDto } from '../../dtos/Document.dto';
import { OpenAIService } from '../../../../../shared/openai/OpenAI.service';

/**
 * Use Case: Create Document
 *
 * Business logic:
 * 1. Validate that document number is unique (if provided)
 * 2. Create document entity with initial state (DRAFT)
 * 3. Generate embedding for semantic search (if fullText provided)
 * 4. Persist document to database
 * 5. Return created document
 *
 * Authorization: EDITOR, ADMIN, SUPER_ADMIN
 */
@Injectable()
export class CreateDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    private readonly openAIService: OpenAIService,
  ) {}

  async execute(dto: CreateDocumentDto, userId: string): Promise<DocumentEntity> {
    // 1. Check if document number already exists
    if (dto.documentNumber) {
      const existing = await this.documentRepository.findByDocumentNumber(dto.documentNumber);
      if (existing) {
        throw new ConflictException(
          `Document with number "${dto.documentNumber}" already exists`,
        );
      }
    }

    // 2. Create document entity
    const documentData = DocumentEntity.create({
      title: dto.title,
      documentNumber: dto.documentNumber,
      type: dto.type,
      scope: dto.scope,
      issuingEntity: dto.issuingEntity,
      summary: dto.summary,
      fullText: dto.fullText,
      keywords: dto.keywords || [],
      createdBy: userId,
    });

    // 3. Generate embedding if fullText is provided
    let embedding: number[] = [];
    if (dto.fullText && dto.fullText.trim().length > 0) {
      try {
        const textForEmbedding = `${dto.title}\n\n${dto.summary || ''}\n\n${dto.fullText.substring(0, 2000)}`;
        embedding = await this.openAIService.generateEmbedding(textForEmbedding);
      } catch (error) {
        // Embedding generation failed, continue without it
      }
    }

    // 4. Persist document
    const document = await this.documentRepository.create({
      ...documentData,
      embedding,
    });

    return document;
  }
}
