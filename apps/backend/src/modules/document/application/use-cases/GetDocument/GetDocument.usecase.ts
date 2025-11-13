import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentRepository } from '../../../domain/repositories/Document.repository.interface';
import { DocumentEntity } from '../../../domain/entities/Document.entity';
import { Role } from '../../../../user/domain/entities/User.entity';

/**
 * Use Case: Get Document by ID
 *
 * Business logic:
 * 1. Find document by ID
 * 2. Check if document exists
 * 3. Apply access control based on user role and document status
 * 4. Return document
 *
 * Access Control:
 * - Public users: Only published, active documents (metadata only without fullText)
 * - Authenticated users with active account: Published documents with fullText
 * - EDITOR/ADMIN/SUPER_ADMIN: All documents including drafts
 */
@Injectable()
export class GetDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(
    documentId: string,
    userRole?: Role,
  ): Promise<DocumentEntity> {
    // 1. Find document
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    // 2. Apply access control
    const canAccessDraft =
      userRole === Role.EDITOR ||
      userRole === Role.ADMIN ||
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.ACCOUNT_OWNER;

    // Check if user can access non-published documents
    if (!document.isPubliclyVisible() && !canAccessDraft) {
      throw new ForbiddenException('You do not have permission to access this document');
    }

    // 3. Return document (fullText will be filtered in controller/dto mapping if needed)
    return document;
  }

  /**
   * Get document for public access (no authentication)
   */
  async executePublic(documentId: string): Promise<Partial<DocumentEntity>> {
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found`);
    }

    if (!document.isPubliclyVisible()) {
      throw new ForbiddenException('This document is not publicly available');
    }

    // Return only public metadata (no fullText)
    return document.getPublicMetadata() as Partial<DocumentEntity>;
  }
}
