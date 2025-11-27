import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { DOCUMENT_CHUNK_REPOSITORY } from '../../../domain/constants/tokens';
import { IDocumentChunkRepository } from '../../../domain/repositories/DocumentChunk.repository.interface';
import { EmbeddingService } from '../../services/EmbeddingService';
import {
  SearchDocumentsRequestDto,
  SearchDocumentsResponseDto,
  SearchResultDto,
} from '../../dtos/SearchDocument.dto';

/**
 * Use Case: Search Documents
 *
 * Performs semantic search across published documents using vector similarity.
 *
 * Flow:
 * 1. Generate embedding for the search query
 * 2. Search chunks by vector similarity (only PUBLISHED documents)
 * 3. Aggregate results by document (best chunk per document)
 * 4. Build snippets from relevant chunks
 * 5. Return sorted results by relevance
 */
@Injectable()
export class SearchDocumentsUseCase {
  private readonly logger = new Logger(SearchDocumentsUseCase.name);
  private readonly MAX_SNIPPET_LENGTH = 350;

  constructor(
    @Inject(DOCUMENT_CHUNK_REPOSITORY)
    private readonly chunkRepository: IDocumentChunkRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async execute(dto: SearchDocumentsRequestDto): Promise<SearchDocumentsResponseDto> {
    const startTime = Date.now();
    const { query, limit = 10, minScore = 0.5 } = dto;

    // Validate query
    if (!query || query.trim().length < 3) {
      throw new BadRequestException('Search query must be at least 3 characters');
    }

    const normalizedQuery = query.trim();
    this.logger.log(`[Search] Starting search for: "${normalizedQuery.substring(0, 50)}..."`);

    // Step 1: Generate embedding for the query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.embeddingService.generateEmbedding(normalizedQuery);
      this.logger.debug(`[Search] Generated query embedding (${queryEmbedding.length} dims)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Search] Failed to generate query embedding: ${errorMsg}`);
      throw new BadRequestException('Failed to process search query');
    }

    // Step 2: Search chunks by vector similarity
    // Request more chunks than needed to allow for aggregation
    const chunkResults = await this.chunkRepository.searchPublishedByVector(
      queryEmbedding,
      {
        limit: limit * 5, // Get more chunks to aggregate
        minSimilarity: minScore,
      },
    );

    this.logger.debug(`[Search] Found ${chunkResults.length} relevant chunks`);

    // Step 3: Aggregate by document - keep only best chunk per document
    const documentMap = new Map<string, {
      documentId: string;
      title: string;
      documentNumber: string | null;
      type: string;
      bestScore: number;
      bestChunk: {
        content: string;
        chunkIndex: number;
      };
    }>();

    for (const result of chunkResults) {
      const existing = documentMap.get(result.documentId);

      if (!existing || result.similarity > existing.bestScore) {
        documentMap.set(result.documentId, {
          documentId: result.documentId,
          title: result.documentTitle,
          documentNumber: result.documentNumber,
          type: result.documentType,
          bestScore: result.similarity,
          bestChunk: {
            content: result.chunk.content,
            chunkIndex: result.chunk.chunkIndex,
          },
        });
      }
    }

    // Step 4: Build results with snippets
    const results: SearchResultDto[] = Array.from(documentMap.values())
      .sort((a, b) => b.bestScore - a.bestScore) // Sort by score descending
      .slice(0, limit) // Limit to requested number
      .map((doc) => ({
        documentId: doc.documentId,
        title: doc.title,
        documentNumber: doc.documentNumber,
        type: doc.type,
        score: Math.round(doc.bestScore * 1000) / 1000, // Round to 3 decimals
        snippet: this.buildSnippet(doc.bestChunk.content, normalizedQuery),
        chunkIndex: doc.bestChunk.chunkIndex,
      }));

    const executionTimeMs = Date.now() - startTime;
    this.logger.log(
      `[Search] Completed in ${executionTimeMs}ms - Found ${results.length} documents`,
    );

    return {
      results,
      total: results.length,
      query: normalizedQuery,
      executionTimeMs,
    };
  }

  /**
   * Build a snippet from chunk content, trying to highlight relevant parts
   */
  private buildSnippet(content: string, query: string): string {
    // Clean up the content
    let snippet = content
      .replace(/\s+/g, ' ')
      .trim();

    // If content is short enough, return as-is
    if (snippet.length <= this.MAX_SNIPPET_LENGTH) {
      return snippet;
    }

    // Try to find query terms in the content
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    let bestStart = 0;
    let bestMatchCount = 0;

    // Scan through content to find the section with most query term matches
    const windowSize = this.MAX_SNIPPET_LENGTH;
    const step = 50;

    for (let i = 0; i < snippet.length - windowSize; i += step) {
      const window = snippet.substring(i, i + windowSize).toLowerCase();
      let matchCount = 0;

      for (const term of queryTerms) {
        if (window.includes(term)) {
          matchCount++;
        }
      }

      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        bestStart = i;
      }
    }

    // Extract snippet from best position
    let start = bestStart;
    let end = Math.min(start + this.MAX_SNIPPET_LENGTH, snippet.length);

    // Adjust to word boundaries
    if (start > 0) {
      // Find next space after start
      const spaceAfterStart = snippet.indexOf(' ', start);
      if (spaceAfterStart !== -1 && spaceAfterStart < start + 20) {
        start = spaceAfterStart + 1;
      }
    }

    // Find last space before end
    const spaceBeforeEnd = snippet.lastIndexOf(' ', end);
    if (spaceBeforeEnd > start + 100) {
      end = spaceBeforeEnd;
    }

    // Build final snippet
    let result = snippet.substring(start, end);

    if (start > 0) {
      result = '...' + result;
    }
    if (end < snippet.length) {
      result = result + '...';
    }

    return result;
  }
}
