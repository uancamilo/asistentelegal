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

// DTOs
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  FilterDocumentsDto,
  DocumentResponseDto,
  DocumentListResponseDto,
  DocumentStatisticsDto,
} from '../../application/dtos/Document.dto';

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
    }

    return response;
  }
}
