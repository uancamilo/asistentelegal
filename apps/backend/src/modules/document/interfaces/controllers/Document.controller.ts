import {
  Controller,
  Get,
  Post,
  Put,
  Patch,

  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,

} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../shared/guards/JwtAuth.guard';
import { RolesGuard } from '../../../../shared/guards/Roles.guard';
import { Roles } from '../../../../shared/decorators/Roles.decorator';
import { CurrentUser } from '../../../../shared/decorators/CurrentUser.decorator';
import { UserEntity, Role } from '../../../user/domain/entities/User.entity';
import { RedisThrottlerGuard } from '../../../../shared/rate-limiting/redis-throttler.guard';

// Use Cases
import { CreateDocumentUseCase } from '../../application/use-cases/CreateDocument/CreateDocument.usecase';
import { GetDocumentUseCase } from '../../application/use-cases/GetDocument/GetDocument.usecase';
import { ListDocumentsUseCase } from '../../application/use-cases/ListDocuments/ListDocuments.usecase';
import { UpdateDocumentUseCase } from '../../application/use-cases/UpdateDocument/UpdateDocument.usecase';
import { PublishDocumentUseCase } from '../../application/use-cases/PublishDocument/PublishDocument.usecase';
import {
  ImportDocumentFromUrlUseCase,
  ImportDocumentFromUrlDto,
  ImportDocumentFromUrlResponseDto,
} from '../../application/use-cases/ImportDocumentFromUrl';
import {
  IngestDocumentUseCase,
  IngestDocumentDto,
  IngestDocumentResponseDto,
} from '../../application/use-cases/IngestDocument';
import {
  ReviewDocumentUseCase,
  ReviewDocumentDto,
  ReviewDocumentResponseDto,
} from '../../application/use-cases/ReviewDocument';
import {
  SubmitDocumentForReviewUseCase,
  SubmitForReviewResponseDto,
} from '../../application/use-cases/SubmitDocumentForReview';
import { SearchDocumentsUseCase } from '../../application/use-cases/SearchDocuments';

// DTOs
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  FilterDocumentsDto,
  DocumentResponseDto,
  DocumentListResponseDto,
  DocumentStatisticsDto,
} from '../../application/dtos/Document.dto';
import {
  SearchDocumentsRequestDto,
  SearchDocumentsResponseDto,
} from '../../application/dtos/SearchDocument.dto';

/**
 * Document Controller
 *
 * Endpoints:
 * - POST   /api/documents              - Create document (EDITOR+)
 * - GET    /api/documents              - List documents (Public for published, EDITOR+ for all)
 * - GET    /api/documents/:id          - Get document by ID (Public for published, EDITOR+ for all)
 * - PUT    /api/documents/:id          - Update document (EDITOR+)
 * - PATCH  /api/documents/:id/publish  - Publish document (EDITOR+)
 * - PATCH  /api/documents/:id/archive  - Archive document (EDITOR+)
 * - GET    /api/documents/stats        - Get statistics (ADMIN+)
 *
 * Access Control:
 * - Public: Can view published documents (metadata only)
 * - Authenticated with active account: Can view published documents with fullText
 * - EDITOR/ADMIN/SUPER_ADMIN: Full CRUD access
 */
@Controller('documents')
@UseGuards(RedisThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class DocumentController {
  constructor(
    private readonly createDocumentUseCase: CreateDocumentUseCase,
    private readonly getDocumentUseCase: GetDocumentUseCase,
    private readonly listDocumentsUseCase: ListDocumentsUseCase,
    private readonly updateDocumentUseCase: UpdateDocumentUseCase,
    private readonly publishDocumentUseCase: PublishDocumentUseCase,
    private readonly importDocumentFromUrlUseCase: ImportDocumentFromUrlUseCase,
    private readonly ingestDocumentUseCase: IngestDocumentUseCase,
    private readonly reviewDocumentUseCase: ReviewDocumentUseCase,
    private readonly submitDocumentForReviewUseCase: SubmitDocumentForReviewUseCase,
    private readonly searchDocumentsUseCase: SearchDocumentsUseCase,
  ) {}

  /**
   * POST /api/documents
   * Create a new document
   *
   * Authorization: EDITOR, ADMIN, SUPER_ADMIN
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: UserEntity,
  ): Promise<DocumentResponseDto> {
    const document = await this.createDocumentUseCase.execute(dto, user.id);
    return this.mapToResponseDto(document, user.role, true);
  }

  /**
   * POST /api/documents/import-url
   * Import document from URL (PDF)
   *
   * Creates a document record and enqueues background processing:
   * 1. Download PDF from URL
   * 2. Extract text
   * 3. Generate embeddings
   *
   * Authorization: EDITOR, ADMIN, SUPER_ADMIN
   */
  @Post('import-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async importFromUrl(
    @Body() dto: ImportDocumentFromUrlDto,
    @CurrentUser() user: UserEntity,
  ): Promise<ImportDocumentFromUrlResponseDto> {
    return this.importDocumentFromUrlUseCase.execute(dto, user.id);
  }

  /**
   * POST /api/documents/ingest
   * Automatic document ingestion with metadata detection
   *
   * This endpoint:
   * 1. Downloads PDF from URL
   * 2. Extracts text content
   * 3. Uses LLM to detect document metadata automatically
   * 4. Detects if PDF contains single or multiple legal documents
   * 5. Returns structured data for form pre-filling
   *
   * NOTE: This does NOT create documents in the database.
   * The response is used to pre-fill the creation form.
   *
   * Authorization: EDITOR, ADMIN, SUPER_ADMIN
   */
  @Post('ingest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Lower rate limit for expensive operation
  async ingest(
    @Body() dto: IngestDocumentDto,
  ): Promise<IngestDocumentResponseDto> {
    return this.ingestDocumentUseCase.execute(dto);
  }

  /**
   * POST /api/documents/search
   * Semantic search across published documents
   *
   * Performs vector similarity search on document chunks.
   * Only searches within PUBLISHED documents.
   *
   * Authorization: Public (no authentication required)
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // Lower rate limit for search
  async search(
    @Body() dto: SearchDocumentsRequestDto,
  ): Promise<SearchDocumentsResponseDto> {
    return this.searchDocumentsUseCase.execute(dto);
  }

  /**
   * GET /api/documents
   * List documents with filtering and pagination
   *
   * Authorization: Public (only published), Authenticated (based on role)
   */
  @Get()
  async list(
    @Query() filters: FilterDocumentsDto,
    @CurrentUser() user?: UserEntity,
  ): Promise<DocumentListResponseDto> {
    const result = await this.listDocumentsUseCase.execute(
      filters,
      user?.role,
    );

    // User has active account if they have an accountId (simplified)
    const hasActiveAccount = !!user?.accountId;

    return {
      ...result,
      documents: result.documents.map((doc) =>
        this.mapToResponseDto(doc, user?.role, hasActiveAccount),
      ),
    };
  }

  /**
   * GET /api/documents/:id
   * Get document by ID
   *
   * Authorization: Public (published only), Authenticated (based on role)
   */
  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() user?: UserEntity,
  ): Promise<DocumentResponseDto> {
    // User has active account if they have an accountId (simplified)
    const hasActiveAccount = !!user?.accountId;

    const document = await this.getDocumentUseCase.execute(
      id,
      user?.role,
    );

    return this.mapToResponseDto(document, user?.role, hasActiveAccount);
  }

  /**
   * PUT /api/documents/:id
   * Update document
   *
   * Authorization: EDITOR, ADMIN, SUPER_ADMIN
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: UserEntity,
  ): Promise<DocumentResponseDto> {
    const document = await this.updateDocumentUseCase.execute(id, dto, user.id);
    return this.mapToResponseDto(document, user.role, true);
  }

  /**
   * PATCH /api/documents/:id/publish
   * Publish document
   *
   * Authorization: EDITOR, ADMIN, SUPER_ADMIN
   */
  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<DocumentResponseDto> {
    const document = await this.publishDocumentUseCase.execute(id, user.id);
    return this.mapToResponseDto(document, user.role, true);
  }

  /**
   * PATCH /api/documents/:id/archive
   * Archive document
   *
   * Authorization: EDITOR, ADMIN, SUPER_ADMIN
   */
  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<DocumentResponseDto> {
    const document = await this.publishDocumentUseCase.archive(id, user.id);
    return this.mapToResponseDto(document, user.role, true);
  }

  /**
   * GET /api/documents/stats
   * Get document statistics
   *
   * Authorization: ADMIN, SUPER_ADMIN
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getStatistics(): Promise<DocumentStatisticsDto> {
    return this.listDocumentsUseCase.getStatistics();
  }

  /**
   * PATCH /api/documents/:id/review
   * Review document (approve or reject)
   *
   * Human review workflow for processed documents.
   * Allows metadata modifications before approval.
   *
   * Authorization: EDITOR, ADMIN, SUPER_ADMIN
   */
  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDto,
    @CurrentUser() user: UserEntity,
  ): Promise<ReviewDocumentResponseDto> {
    return this.reviewDocumentUseCase.execute(id, dto, user.id);
  }

  /**
   * PATCH /api/documents/:id/submit-review
   * Submit document for review
   *
   * Transitions document from DRAFT to IN_REVIEW status.
   * Only documents in DRAFT status can be submitted.
   *
   * Authorization: ACCOUNT_OWNER, MEMBER (document owners)
   */
  @Patch(':id/submit-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ACCOUNT_OWNER, Role.MEMBER)
  async submitForReview(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<SubmitForReviewResponseDto> {
    return this.submitDocumentForReviewUseCase.execute(id, user.id);
  }

  /**
   * Map domain entity to response DTO
   * Apply access control for fullText field
   */
  private mapToResponseDto(
    document: any,
    userRole?: Role,
    hasActiveAccount?: boolean,
  ): DocumentResponseDto {
    const isEditor = userRole && [Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN, Role.ACCOUNT_OWNER].includes(userRole);
    const canAccessFullText = hasActiveAccount || isEditor;

    const response: DocumentResponseDto = {
      id: document.id,
      title: document.title,
      documentNumber: document.documentNumber,
      type: document.type,
      hierarchyLevel: document.hierarchyLevel,
      scope: document.scope,
      issuingEntity: document.issuingEntity,
      isActive: document.isActive,
      status: document.status,
      summary: document.summary,
      keywords: document.keywords,
      publishedAt: document.publishedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    // Include fullText only if user has access
    if (canAccessFullText) {
      response.fullText = document.fullText;
    }

    // Include admin fields for editors
    if (isEditor) {
      response.createdBy = document.createdBy;
      response.updatedBy = document.updatedBy;
      response.publishedBy = document.publishedBy;

      // Include processing and review fields for editors
      response.processingStatus = document.processingStatus;
      response.embeddingStatus = document.embeddingStatus;
      response.embeddingError = document.embeddingError;
      response.sourceUrl = document.sourceUrl;
      response.reviewedBy = document.reviewedBy;
      response.reviewedAt = document.reviewedAt;
      response.rejectionReason = document.rejectionReason;
    }

    return response;
  }
}
