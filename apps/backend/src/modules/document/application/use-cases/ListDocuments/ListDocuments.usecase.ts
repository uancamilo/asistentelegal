import { Injectable, Inject } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '../../../domain/constants/tokens';
import {
  IDocumentRepository,
  FindDocumentsResult,
} from '../../../domain/repositories/Document.repository.interface';
import { FilterDocumentsDto } from '../../dtos/Document.dto';
import { Role } from '../../../../user/domain/entities/User.entity';
import { DocumentStatus } from '../../../domain/entities/DocumentEnums';

/**
 * Use Case: List Documents with filtering and pagination
 *
 * Business logic:
 * 1. Build filters based on user role and access level
 * 2. Query documents with pagination
 * 3. Return paginated results
 *
 * Access Control:
 * - Public/Guest users: Only published documents
 * - Authenticated users: Only published documents (but can access fullText if has active account)
 * - EDITOR/ADMIN/SUPER_ADMIN: All documents including drafts
 */
@Injectable()
export class ListDocumentsUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async execute(
    filters: FilterDocumentsDto,
    userRole?: Role,
  ): Promise<FindDocumentsResult> {
    // Apply access control filters
    const canAccessDraft =
      userRole === Role.EDITOR ||
      userRole === Role.ADMIN ||
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.ACCOUNT_OWNER;

    // If user cannot access drafts, force status to PUBLISHED
    if (!canAccessDraft && filters.status !== DocumentStatus.PUBLISHED) {
      filters.status = DocumentStatus.PUBLISHED;
      filters.isActive = true;
    }

    // Build query options
    const options = {
      type: filters.type,
      status: filters.status,
      scope: filters.scope,
      isActive: filters.isActive,
      searchText: filters.searchText,
      page: filters.page || 1,
      limit: filters.limit || 20,
      sortBy: filters.sortBy || 'createdAt',
      sortOrder: filters.sortOrder || 'desc',
    };

    // Execute query
    const result = await this.documentRepository.findMany(options);

    return result;
  }

  /**
   * List documents for public access (no authentication)
   */
  async executePublic(filters: FilterDocumentsDto): Promise<FindDocumentsResult> {
    return this.documentRepository.findPublished({
      ...filters,
      isActive: true,
    });
  }

  /**
   * Get document statistics (ADMIN/SUPER_ADMIN only)
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    publishedDocuments: number;
    draftDocuments: number;
    archivedDocuments: number;
    byType: any;
    byScope: any;
  }> {
    return this.documentRepository.getStatistics();
  }
}
