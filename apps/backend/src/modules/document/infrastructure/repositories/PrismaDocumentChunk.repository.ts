import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import {
  IDocumentChunkRepository,
  DocumentChunkEntity,
  ChunkSearchResult,
} from '../../domain/repositories/DocumentChunk.repository.interface';

/**
 * Prisma implementation of DocumentChunk Repository
 *
 * Handles persistence of document chunks with embeddings for semantic search.
 * Uses raw SQL for vector operations with pgvector.
 */
@Injectable()
export class PrismaDocumentChunkRepository implements IDocumentChunkRepository {
  private readonly logger = new Logger(PrismaDocumentChunkRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createChunks(
    documentId: string,
    chunks: Array<{ chunkIndex: number; content: string; embedding: number[]; articleRef?: string }>,
  ): Promise<DocumentChunkEntity[]> {
    if (chunks.length === 0) {
      return [];
    }

    // Delete existing chunks first
    await this.deleteChunks(documentId);

    // Insert new chunks using raw SQL for vector support
    const createdChunks: DocumentChunkEntity[] = [];

    for (const chunk of chunks) {
      const embeddingString = `[${chunk.embedding.join(',')}]`;
      const articleRef = chunk.articleRef || null;

      // Use raw SQL to insert with vector type
      const result = await this.prisma.$queryRaw<Array<{
        id: string;
        documentId: string;
        chunkIndex: number;
        content: string;
        articleRef: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>>`
        INSERT INTO "document_chunks" ("id", "documentId", "chunkIndex", "content", "articleRef", "embedding", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${documentId},
          ${chunk.chunkIndex},
          ${chunk.content},
          ${articleRef},
          ${embeddingString}::vector,
          NOW(),
          NOW()
        )
        RETURNING "id", "documentId", "chunkIndex", "content", "articleRef", "createdAt", "updatedAt"
      `;

      if (result.length > 0 && result[0]) {
        const row = result[0];
        createdChunks.push({
          id: row.id,
          documentId: row.documentId,
          chunkIndex: row.chunkIndex,
          content: row.content,
          articleRef: row.articleRef || undefined,
          embedding: chunk.embedding,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
    }

    this.logger.log(
      `Created ${createdChunks.length} chunks for document ${documentId}`,
    );

    return createdChunks;
  }

  async deleteChunks(documentId: string): Promise<number> {
    const result = await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    if (result.count > 0) {
      this.logger.debug(
        `Deleted ${result.count} chunks for document ${documentId}`,
      );
    }

    return result.count;
  }

  async findByDocumentId(documentId: string): Promise<DocumentChunkEntity[]> {
    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });

    return chunks.map((chunk) => this.toDomain(chunk));
  }

  async countByDocumentId(documentId: string): Promise<number> {
    return this.prisma.documentChunk.count({
      where: { documentId },
    });
  }

  async searchByVector(
    embedding: number[],
    options?: {
      limit?: number;
      minSimilarity?: number;
      documentIds?: string[];
    },
  ): Promise<ChunkSearchResult[]> {
    const limit = options?.limit ?? 10;
    const minSimilarity = options?.minSimilarity ?? 0.7;
    const embeddingString = `[${embedding.join(',')}]`;

    // Build document filter
    let documentFilter = '';
    if (options?.documentIds && options.documentIds.length > 0) {
      const docIds = options.documentIds.map((id) => `'${id}'`).join(',');
      documentFilter = `AND "documentId" IN (${docIds})`;
    }

    // Use cosine similarity for vector search
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        documentId: string;
        chunkIndex: number;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        similarity: number;
      }>
    >`
      SELECT
        "id",
        "documentId",
        "chunkIndex",
        "content",
        "createdAt",
        "updatedAt",
        1 - ("embedding" <=> ${embeddingString}::vector) as similarity
      FROM "document_chunks"
      WHERE "embedding" IS NOT NULL
        ${documentFilter ? this.prisma.$queryRawUnsafe(documentFilter) : this.prisma.$queryRaw``}
      ORDER BY "embedding" <=> ${embeddingString}::vector
      LIMIT ${limit}
    `;

    return results
      .filter((r) => r.similarity >= minSimilarity)
      .map((r) => ({
        chunk: {
          id: r.id,
          documentId: r.documentId,
          chunkIndex: r.chunkIndex,
          content: r.content,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
        documentId: r.documentId,
        similarity: r.similarity,
      }));
  }

  async findByDocumentIdAndIndex(
    documentId: string,
    chunkIndex: number,
  ): Promise<DocumentChunkEntity | null> {
    const chunk = await this.prisma.documentChunk.findUnique({
      where: {
        documentId_chunkIndex: {
          documentId,
          chunkIndex,
        },
      },
    });

    return chunk ? this.toDomain(chunk) : null;
  }

  async hasChunks(documentId: string): Promise<boolean> {
    const count = await this.prisma.documentChunk.count({
      where: { documentId },
      take: 1,
    });
    return count > 0;
  }

  async updateEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const embeddingString = `[${embedding.join(',')}]`;

    await this.prisma.$executeRaw`
      UPDATE "document_chunks"
      SET "embedding" = ${embeddingString}::vector, "updatedAt" = NOW()
      WHERE "id" = ${chunkId}
    `;
  }

  async searchPublishedByVector(
    embedding: number[],
    options?: {
      limit?: number;
      minSimilarity?: number;
    },
  ): Promise<Array<ChunkSearchResult & { documentTitle: string; documentNumber: string | null; documentType: string; articleRef?: string }>> {
    const limit = options?.limit ?? 10;
    const minSimilarity = options?.minSimilarity ?? 0.5;
    const embeddingString = `[${embedding.join(',')}]`;

    // Search chunks with JOIN to documents table, filtering by PUBLISHED status
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        documentId: string;
        chunkIndex: number;
        content: string;
        articleRef: string | null;
        createdAt: Date;
        updatedAt: Date;
        similarity: number;
        documentTitle: string;
        documentNumber: string | null;
        documentType: string;
      }>
    >`
      SELECT
        c."id",
        c."documentId",
        c."chunkIndex",
        c."content",
        c."articleRef",
        c."createdAt",
        c."updatedAt",
        1 - (c."embedding" <=> ${embeddingString}::vector) as similarity,
        d."title" as "documentTitle",
        d."documentNumber" as "documentNumber",
        d."type" as "documentType"
      FROM "document_chunks" c
      INNER JOIN "documents" d ON c."documentId" = d."id"
      WHERE c."embedding" IS NOT NULL
        AND d."status" = 'PUBLISHED'
        AND d."isActive" = true
      ORDER BY c."embedding" <=> ${embeddingString}::vector
      LIMIT ${limit * 3}
    `;

    // Filter by minimum similarity and return
    return results
      .filter((r) => r.similarity >= minSimilarity)
      .slice(0, limit)
      .map((r) => ({
        chunk: {
          id: r.id,
          documentId: r.documentId,
          chunkIndex: r.chunkIndex,
          content: r.content,
          articleRef: r.articleRef || undefined,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
        documentId: r.documentId,
        similarity: r.similarity,
        documentTitle: r.documentTitle,
        documentNumber: r.documentNumber,
        documentType: r.documentType,
        articleRef: r.articleRef || undefined,
      }));
  }

  private toDomain(chunk: any): DocumentChunkEntity {
    return {
      id: chunk.id,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: undefined, // Don't load embedding by default (large data)
      createdAt: chunk.createdAt,
      updatedAt: chunk.updatedAt,
    };
  }
}
