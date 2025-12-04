import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  IDocumentRepository,
  FindDocumentsOptions,
  FindDocumentsResult,
  VectorSearchOptions,
  SimilaritySearchOptions,
  KeywordSearchOptions,
} from '../../domain/repositories/Document.repository.interface';
import { DocumentEntity, DocumentCreateData } from '../../domain/entities/Document.entity';
import { DocumentType, DocumentStatus, DocumentScope } from '../../domain/entities/DocumentEnums';
import { Prisma } from '@prisma/client';

/**
 * Prisma implementation of Document Repository
 *
 * This adapter translates domain operations to Prisma queries
 * and maps Prisma models to domain entities.
 */
@Injectable()
export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    document: DocumentCreateData,
  ): Promise<DocumentEntity> {
    const created = await this.prisma.document.create({
      data: {
        title: document.title,
        documentNumber: document.documentNumber,
        type: document.type,
        hierarchyLevel: document.hierarchyLevel,
        scope: document.scope as any,
        issuingEntity: document.issuingEntity,
        isActive: document.isActive,
        status: document.status,
        summary: document.summary,
        fullText: document.fullText,
        keywords: document.keywords,
        createdBy: document.createdBy,
        updatedBy: document.updatedBy,
        publishedBy: document.publishedBy,
        publishedAt: document.publishedAt,
        // Processing status fields (optional, with defaults)
        processingStatus: document.processingStatus ?? 'MANUAL',
        embeddingStatus: document.embeddingStatus ?? 'PENDING',
        embeddingError: document.embeddingError ?? null,
        sourceUrl: document.sourceUrl ?? null,
      } as any,
    });

    return this.toDomain(created as any);
  }

  async findById(id: string): Promise<DocumentEntity | null> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        documentNumber: true,
        type: true,
        hierarchyLevel: true,
        scope: true,
        issuingEntity: true,
        isActive: true,
        status: true,
        summary: true,
        fullText: true,
        keywords: true,
        createdBy: true,
        updatedBy: true,
        publishedBy: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return document ? this.toDomain(document as any) : null;
  }

  async findByDocumentNumber(documentNumber: string): Promise<DocumentEntity | null> {
    const document = await this.prisma.document.findFirst({
      where: { documentNumber },
      select: {
        id: true,
        title: true,
        documentNumber: true,
        type: true,
        hierarchyLevel: true,
        scope: true,
        issuingEntity: true,
        isActive: true,
        status: true,
        summary: true,
        fullText: true,
        keywords: true,
        createdBy: true,
        updatedBy: true,
        publishedBy: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return document ? this.toDomain(document as any) : null;
  }

  async findMany(options: FindDocumentsOptions): Promise<FindDocumentsResult> {
    const {
      type,
      status,
      scope,
      isActive,
      createdBy,
      searchText,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build where clause
    const where: Prisma.DocumentWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (scope) where.scope = scope as any;
    if (isActive !== undefined) where.isActive = isActive;
    if (createdBy) where.createdBy = createdBy;

    if (searchText) {
      where.OR = [
        { title: { contains: searchText, mode: 'insensitive' } },
        { summary: { contains: searchText, mode: 'insensitive' } },
        { keywords: { has: searchText } },
      ];
    }

    // Execute query with pagination
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          documentNumber: true,
          type: true,
          hierarchyLevel: true,
          scope: true,
          issuingEntity: true,
          isActive: true,
          status: true,
          summary: true,
          fullText: true,
          keywords: true,
          createdBy: true,
          updatedBy: true,
          publishedBy: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      documents: documents.map((doc) => this.toDomain(doc as any)), // TYPE SAFETY FIX (P3.8): Type inferred from toDomain
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchByVector(options: VectorSearchOptions): Promise<DocumentEntity[]> {
    // TODO: This method needs to be refactored to use DocumentChunk for semantic search
    // For now, it returns an empty array as document-level embeddings have been removed
    // Use IDocumentChunkRepository.searchByVector() for chunk-based semantic search
    const { limit = 10, filters } = options;

    // Fallback to keyword search or return empty until chunk search is implemented
    const where: Prisma.DocumentWhereInput = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.scope) where.scope = filters.scope as any;

    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);

    const documents = await this.prisma.document.findMany({
      where,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentNumber: true,
        type: true,
        hierarchyLevel: true,
        scope: true,
        issuingEntity: true,
        isActive: true,
        status: true,
        summary: true,
        fullText: true,
        keywords: true,
        createdBy: true,
        updatedBy: true,
        publishedBy: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return documents.map((doc) => this.toDomain(doc as any));
  }

  /**
   * Search documents by similarity with enhanced options
   * Returns documents with similarity scores
   *
   * TODO: This method needs to be refactored to use DocumentChunk for semantic search
   * Use IDocumentChunkRepository.searchByVector() for chunk-based semantic search
   */
  async searchBySimilarity(
    _embedding: number[],
    options: SimilaritySearchOptions,
  ): Promise<Array<DocumentEntity & { similarity: number }>> {
    // Fallback: return most recent documents with 0 similarity until chunk search is implemented
    const {
      limit = 10,
      type,
      scope,
      onlyActive = true,
      onlyPublished = true,
    } = options;

    const where: Prisma.DocumentWhereInput = {};
    if (type) where.type = type;
    if (scope) where.scope = scope as any;
    if (onlyActive) where.isActive = true;
    if (onlyPublished) where.status = DocumentStatus.PUBLISHED;

    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);

    const documents = await this.prisma.document.findMany({
      where,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentNumber: true,
        type: true,
        hierarchyLevel: true,
        scope: true,
        issuingEntity: true,
        isActive: true,
        status: true,
        summary: true,
        fullText: true,
        keywords: true,
        createdBy: true,
        updatedBy: true,
        publishedBy: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return documents.map((doc) =>
      Object.assign(this.toDomain(doc as any), {
        similarity: 0 // Placeholder until chunk-based search is implemented
      })
    );
  }

  /**
   * Search documents by keywords (traditional text search)
   * Searches in title, summary, fullText, and keywords array
   */
  async searchByKeywords(
    query: string,
    options: KeywordSearchOptions,
  ): Promise<Array<DocumentEntity & { keywordScore: number }>> {
    const {
      limit = 10,
      type,
      scope,
      onlyActive = true,
      onlyPublished = true,
    } = options;

    // Build where clause
    const where: Prisma.DocumentWhereInput = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
        { fullText: { contains: query, mode: 'insensitive' } },
        { keywords: { hasSome: query.split(/\s+/) } },
      ],
    };

    if (type) where.type = type;
    if (scope) where.scope = scope as any;
    if (onlyActive) where.isActive = true;
    if (onlyPublished) where.status = DocumentStatus.PUBLISHED;

    const documents = await this.prisma.document.findMany({
      where,
      take: Math.min(Math.max(1, Math.floor(limit)), 100),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        documentNumber: true,
        type: true,
        hierarchyLevel: true,
        scope: true,
        issuingEntity: true,
        isActive: true,
        status: true,
        summary: true,
        fullText: true,
        keywords: true,
        createdBy: true,
        updatedBy: true,
        publishedBy: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate simple keyword score based on match quality
    return documents.map((doc, index) => {
      let score = 0.8; // Base score

      // Boost if query appears in title (most important)
      if (doc.title.toLowerCase().includes(query.toLowerCase())) {
        score += 0.2;
      }

      // Boost if query appears in keywords
      const queryWords = query.toLowerCase().split(/\s+/);
      const matchingKeywords = doc.keywords.filter((kw: string) =>
        queryWords.some((qw) => kw.toLowerCase().includes(qw))
      );
      score += matchingKeywords.length * 0.05;

      // Reduce score based on position (first results are better)
      score -= index * 0.01;

      return Object.assign(this.toDomain(doc as any), {
        keywordScore: Math.min(1, Math.max(0, score))
      });
    });
  }

  async update(id: string, data: Partial<DocumentEntity>): Promise<DocumentEntity> {
    // TYPE SAFETY FIX (P3.8): Use Prisma.DocumentUncheckedUpdateInput to allow direct field updates
    const updateData: Prisma.DocumentUncheckedUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.hierarchyLevel !== undefined) updateData.hierarchyLevel = data.hierarchyLevel;
    if (data.scope !== undefined) updateData.scope = data.scope;
    if (data.issuingEntity !== undefined) updateData.issuingEntity = data.issuingEntity; // FIX: Was missing
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.fullText !== undefined) updateData.fullText = data.fullText;
    if (data.keywords !== undefined) updateData.keywords = data.keywords;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;
    if (data.publishedBy !== undefined) updateData.publishedBy = data.publishedBy;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;
    // Processing status fields
    if (data.processingStatus !== undefined) (updateData as any).processingStatus = data.processingStatus;
    if (data.embeddingStatus !== undefined) (updateData as any).embeddingStatus = data.embeddingStatus;
    if (data.embeddingError !== undefined) updateData.embeddingError = data.embeddingError;
    if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
    // Review fields
    if (data.reviewedBy !== undefined) updateData.reviewedBy = data.reviewedBy;
    if (data.reviewedAt !== undefined) updateData.reviewedAt = data.reviewedAt;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

    const updated = await this.prisma.document.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        documentNumber: true,
        type: true,
        hierarchyLevel: true,
        scope: true,
        issuingEntity: true,
        isActive: true,
        status: true,
        summary: true,
        fullText: true,
        keywords: true,
        createdBy: true,
        updatedBy: true,
        publishedBy: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.toDomain(updated as any);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.document.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.document.delete({
      where: { id },
    });
  }

  async count(filters?: {
    type?: DocumentType;
    status?: DocumentStatus;
    scope?: DocumentScope;
    isActive?: boolean;
  }): Promise<number> {
    return this.prisma.document.count({
      where: filters as any,
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.document.count({
      where: { id },
    });
    return count > 0;
  }

  async findPublished(
    options: Omit<FindDocumentsOptions, 'status'>,
  ): Promise<FindDocumentsResult> {
    return this.findMany({
      ...options,
      status: DocumentStatus.PUBLISHED,
      isActive: true,
    });
  }

  async getStatistics(): Promise<{
    totalDocuments: number;
    publishedDocuments: number;
    draftDocuments: number;
    archivedDocuments: number;
    byType: Record<DocumentType, number>;
    byScope: Record<DocumentScope, number>;
  }> {
    const [total, published, draft, archived, byType, byScope] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { status: DocumentStatus.PUBLISHED } }),
      this.prisma.document.count({ where: { status: DocumentStatus.DRAFT } }),
      this.prisma.document.count({ where: { status: DocumentStatus.ARCHIVED } }),
      this.prisma.document.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.document.groupBy({
        by: ['scope'],
        _count: true,
      }),
    ]);

    const byTypeMap = {} as Record<DocumentType, number>;
    // TYPE SAFETY FIX (P3.8): Type inferred from Prisma groupBy result
    byType.forEach((item) => {
      byTypeMap[item.type as DocumentType] = item._count;
    });

    const byScopeMap = {} as Record<DocumentScope, number>;
    // TYPE SAFETY FIX (P3.8): Type inferred from Prisma groupBy result
    byScope.forEach((item) => {
      byScopeMap[item.scope as DocumentScope] = item._count;
    });

    return {
      totalDocuments: total,
      publishedDocuments: published,
      draftDocuments: draft,
      archivedDocuments: archived,
      byType: byTypeMap,
      byScope: byScopeMap,
    };
  }

  /**
   * Map Prisma model to Domain Entity
   */
  private toDomain(prismaDoc: any): DocumentEntity {
    return new DocumentEntity(
      prismaDoc.id,
      prismaDoc.title,
      prismaDoc.documentNumber,
      prismaDoc.type as DocumentType,
      prismaDoc.hierarchyLevel,
      prismaDoc.scope as DocumentScope,
      prismaDoc.issuingEntity,
      prismaDoc.isActive,
      prismaDoc.status as DocumentStatus,
      prismaDoc.summary,
      prismaDoc.fullText,
      prismaDoc.keywords,
      prismaDoc.createdBy,
      prismaDoc.updatedBy,
      prismaDoc.publishedBy,
      prismaDoc.publishedAt,
      prismaDoc.createdAt,
      prismaDoc.updatedAt,
      // Processing status fields
      prismaDoc.processingStatus || 'MANUAL',
      prismaDoc.embeddingStatus || 'PENDING',
      prismaDoc.embeddingError || null,
      prismaDoc.sourceUrl || null,
      prismaDoc.reviewedBy || null,
      prismaDoc.reviewedAt || null,
      prismaDoc.rejectionReason || null,
    );
  }
}
