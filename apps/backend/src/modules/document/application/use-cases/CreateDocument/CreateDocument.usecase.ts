import { Injectable, Inject, ConflictException, Logger } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { CreateDocumentDto } from '../../dtos/Document.dto';

/**
 * Use Case: Create Document
 *
 * Business logic:
 * 1. Validate that document number is unique (if provided)
 * 2. Create document entity with initial state (DRAFT)
 * 3. Persist document to database
 * 4. Return created document
 *
 * Note: Embedding generation is now handled asynchronously via the document processor
 * when importing from URL. For manually created documents, embeddings are generated
 * when the document is submitted for review or published.
 *
 * Authorization: EDITOR, ADMIN, SUPER_ADMIN
 */
@Injectable()
export class CreateDocumentUseCase {
  private readonly logger = new Logger(CreateDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(dto: CreateDocumentDto, userId: string): Promise<DocumentEntity> {
    this.logger.log(`[CreateDocument] Starting creation for: ${dto.title}`);

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

    this.logger.log(`[CreateDocument] Persisting document to database...`);

    // 3. Persist document
    const document = await this.documentRepository.create(documentData);

    this.logger.log(`[CreateDocument] Document created with ID: ${document.id}`);

    return document;
  }
}
