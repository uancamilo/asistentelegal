import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentStatus } from '../../../domain/entities/DocumentEnums';

/**
 * Response DTO for submit-for-review action
 */
export interface SubmitForReviewResponseDto {
  id: string;
  title: string;
  status: string;
  submittedBy: string;
  submittedAt: Date;
  message: string;
}

/**
 * Use Case: Submit Document For Review
 *
 * Transitions a document from DRAFT to IN_REVIEW status.
 *
 * Business logic:
 * 1. Find document by ID
 * 2. Validate document is in DRAFT status
 * 3. Use domain method to transition to IN_REVIEW
 * 4. Persist changes
 * 5. Return result
 *
 * Authorization: ACCOUNT_OWNER, MEMBER (document owners)
 */
@Injectable()
export class SubmitDocumentForReviewUseCase {
  private readonly logger = new Logger(SubmitDocumentForReviewUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(
    documentId: string,
    userId: string,
  ): Promise<SubmitForReviewResponseDto> {
    this.logger.log(`[SubmitForReview] Document ${documentId} by user ${userId}`);

    // 1. Find document
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      this.logger.warn(`[SubmitForReview] Document ${documentId} not found`);
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    this.logger.log(
      `[SubmitForReview] Document found: "${document.title}" (status: ${document.status})`,
    );

    // 2. Validate document is in DRAFT status
    if (document.status !== DocumentStatus.DRAFT) {
      this.logger.warn(
        `[SubmitForReview] Document ${documentId} cannot be submitted (status: ${document.status})`,
      );
      throw new ConflictException(
        `Document cannot be submitted for review. Current status: ${document.status}. ` +
          `Only documents in DRAFT status can be submitted for review.`,
      );
    }

    // 3. Use domain method to transition
    const now = new Date();
    try {
      document.submitForReview(userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[SubmitForReview] Domain error: ${errorMessage}`);
      throw new ConflictException(errorMessage);
    }

    // 4. Persist changes
    const updatedDocument = await this.documentRepository.update(documentId, {
      status: DocumentStatus.IN_REVIEW,
      updatedBy: userId,
    });

    this.logger.log(
      `[SubmitForReview] Document ${documentId} submitted for review successfully`,
    );

    // 5. Return result
    return {
      id: updatedDocument.id,
      title: updatedDocument.title,
      status: updatedDocument.status,
      submittedBy: userId,
      submittedAt: now,
      message: `Document "${updatedDocument.title}" has been submitted for review.`,
    };
  }
}
