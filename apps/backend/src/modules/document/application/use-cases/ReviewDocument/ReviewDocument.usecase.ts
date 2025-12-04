import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { DocumentStatus } from '../../../domain/entities/DocumentEnums';
import { ReviewDocumentDto, ReviewDocumentResponseDto } from '../../dtos/ReviewDocument.dto';

/**
 * Use Case: Review Document
 *
 * Human review workflow for documents that have been processed (PDF extraction + embedding).
 *
 * Business logic:
 * 1. Find document by ID
 * 2. Validate document can be reviewed (must be in DRAFT status)
 * 3. Apply metadata updates if provided (title, scope, summary, tags)
 * 4. If approved:
 *    - Set status to PUBLISHED
 *    - Clear rejectionReason
 *    - Set publishedBy and publishedAt
 * 5. If rejected:
 *    - Keep status as DRAFT (for correction)
 *    - Set rejectionReason
 * 6. Set reviewedBy and reviewedAt in both cases
 * 7. Persist changes and return result
 *
 * Authorization: EDITOR, ADMIN, SUPER_ADMIN
 */
@Injectable()
export class ReviewDocumentUseCase {
  private readonly logger = new Logger(ReviewDocumentUseCase.name);

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(
    documentId: string,
    dto: ReviewDocumentDto,
    reviewerId: string,
  ): Promise<ReviewDocumentResponseDto> {
    this.logger.log(`[Review] Starting review for document ${documentId}`);
    this.logger.log(`[Review] Action: ${dto.approved ? 'APPROVE' : 'REJECT'}`);
    this.logger.log(`[Review] Reviewer: ${reviewerId}`);

    // 1. Find document
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      this.logger.warn(`[Review] Document ${documentId} not found`);
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    this.logger.log(`[Review] Document found: "${document.title}" (status: ${document.status})`);

    // 2. Validate document can be reviewed
    // Documents can be reviewed if they are in DRAFT or IN_REVIEW status
    // PUBLISHED documents CANNOT be reviewed again - this is a terminal state for the review workflow
    const reviewableStatuses = [DocumentStatus.DRAFT, DocumentStatus.IN_REVIEW];
    if (!reviewableStatuses.includes(document.status as DocumentStatus)) {
      this.logger.warn(`[Review] Document ${documentId} cannot be reviewed (status: ${document.status})`);

      // Provide specific error message for PUBLISHED documents
      if (document.status === DocumentStatus.PUBLISHED) {
        throw new BadRequestException(
          `Document is already PUBLISHED and cannot be reviewed again. ` +
          `Published documents cannot transition back to IN_REVIEW, DRAFT, or PENDING states.`
        );
      }

      throw new BadRequestException(
        `Document cannot be reviewed. Current status: ${document.status}. ` +
        `Only documents in DRAFT or IN_REVIEW status can be reviewed.`
      );
    }

    // 3. Build update data
    const now = new Date();
    const updateData: Partial<DocumentEntity> & {
      reviewedBy: string;
      reviewedAt: Date;
      status: DocumentStatus;
      rejectionReason?: string | null;
      publishedBy?: string;
      publishedAt?: Date;
      keywords?: string[];
    } = {
      reviewedBy: reviewerId,
      reviewedAt: now,
      updatedBy: reviewerId,
      status: dto.approved ? DocumentStatus.PUBLISHED : DocumentStatus.DRAFT,
    };

    // 4. Apply metadata updates if provided
    if (dto.title !== undefined) {
      updateData.title = dto.title;
      this.logger.log(`[Review] Updating title to: "${dto.title}"`);
    }

    if (dto.scope !== undefined) {
      updateData.scope = dto.scope;
      this.logger.log(`[Review] Updating scope to: ${dto.scope}`);
    }

    if (dto.summary !== undefined) {
      updateData.summary = dto.summary;
      this.logger.log(`[Review] Updating summary (${dto.summary.length} chars)`);
    }

    if (dto.tags !== undefined) {
      updateData.keywords = dto.tags;
      this.logger.log(`[Review] Updating tags: ${dto.tags.join(', ')}`);
    }

    // 5. Handle approval vs rejection
    if (dto.approved) {
      // Approved: Set to PUBLISHED
      updateData.status = DocumentStatus.PUBLISHED;
      updateData.rejectionReason = null;
      updateData.publishedBy = reviewerId;
      updateData.publishedAt = now;
      this.logger.log(`[Review] Document APPROVED - setting status to PUBLISHED`);
    } else {
      // Rejected: Keep as DRAFT with reason
      updateData.status = DocumentStatus.DRAFT;
      updateData.rejectionReason = dto.rejectionReason || 'No reason provided';
      this.logger.log(`[Review] Document REJECTED - reason: ${dto.rejectionReason}`);
    }

    // 6. Persist changes
    try {
      const updatedDocument = await this.documentRepository.update(documentId, updateData as any);
      this.logger.log(`[Review] Document ${documentId} updated successfully`);

      // 7. Return response
      return {
        id: updatedDocument.id,
        title: updatedDocument.title,
        status: updatedDocument.status,
        reviewedBy: reviewerId,
        reviewedAt: now,
        rejectionReason: dto.approved ? null : (dto.rejectionReason || null),
        message: dto.approved
          ? `Document "${updatedDocument.title}" has been approved and published.`
          : `Document "${updatedDocument.title}" has been rejected. Reason: ${dto.rejectionReason}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Review] Failed to update document: ${errorMessage}`);
      throw new BadRequestException(`Failed to update document: ${errorMessage}`);
    }
  }

  /**
   * Get documents pending review
   * Returns documents in DRAFT status with processingStatus=COMPLETED
   */
  async getPendingReview(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ documents: DocumentEntity[]; total: number }> {
    const { page = 1, limit = 20 } = options || {};

    const result = await this.documentRepository.findMany({
      status: DocumentStatus.DRAFT,
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    // Filter to only include documents that have been processed (have fullText)
    const pendingReview = result.documents.filter(doc =>
      doc.fullText && doc.fullText.length > 0
    );

    return {
      documents: pendingReview,
      total: pendingReview.length,
    };
  }
}
