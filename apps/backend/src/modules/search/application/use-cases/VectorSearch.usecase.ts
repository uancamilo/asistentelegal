import { Injectable, Inject, Logger } from '@nestjs/common';
import { OpenAIService } from '../../../../shared/openai/OpenAI.service';
import { DOCUMENT_REPOSITORY } from '../../../document/domain/constants/tokens';
import { IDocumentRepository } from '../../../document/domain/repositories/Document.repository.interface';
import { SemanticSearchDto, SearchResultDto, SearchResponseDto } from '../dtos/Search.dto';
import { SearchAnalyticsService } from '../services/SearchAnalytics.service';

/**
 * Vector Search Use Case
 *
 * Performs semantic search using OpenAI embeddings and pgvector similarity
 *
 * Flow:
 * 1. Generate embedding for user query
 * 2. Search in database using vector similarity (pgvector)
 * 3. Filter by type, scope, active status if specified
 * 4. Return ranked results with similarity scores
 */
@Injectable()
export class VectorSearchUseCase {
  private readonly logger = new Logger(VectorSearchUseCase.name);

  constructor(
    private readonly openaiService: OpenAIService,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    private readonly analyticsService: SearchAnalyticsService,
  ) {}

  async execute(dto: SemanticSearchDto, userId: string): Promise<SearchResponseDto> {
    const startTime = Date.now();
    let openaiLatencyMs: number | undefined;
    let pgvectorLatencyMs: number | undefined;
    let searchQueryId = '';

    try {
      this.logger.debug(`Starting semantic search for query: "${dto.query}"`);

      // 1. Generate embedding for query
      const embeddingStart = Date.now();
      const queryEmbedding = await this.openaiService.generateEmbedding(dto.query);
      openaiLatencyMs = Date.now() - embeddingStart;
      this.logger.debug(`Query embedding generated (${queryEmbedding.length} dimensions) in ${openaiLatencyMs}ms`);

      // 2. Search documents using vector similarity
      const pgvectorStart = Date.now();
      const documents = await this.documentRepository.searchBySimilarity(
        queryEmbedding,
        {
          limit: dto.limit || 10,
          similarityThreshold: dto.similarityThreshold || 0.7,
          type: dto.type,
          scope: dto.scope,
          onlyActive: dto.onlyActive !== false,
          onlyPublished: true, // Only search published documents
        }
      );
      pgvectorLatencyMs = Date.now() - pgvectorStart;

      this.logger.debug(`Found ${documents.length} documents matching similarity threshold in ${pgvectorLatencyMs}ms`);

      // 3. Map to SearchResultDto
      const results: SearchResultDto[] = documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        documentNumber: doc.documentNumber,
        type: doc.type,
        hierarchyLevel: doc.hierarchyLevel,
        scope: doc.scope,
        issuingEntity: doc.issuingEntity,
        status: doc.status,
        summary: doc.summary,
        keywords: doc.keywords,
        publishedAt: doc.publishedAt,
        similarity: doc.similarity || 0,
        relevanceScore: doc.similarity || 0,
        matchType: 'semantic',
        excerpt: this.extractRelevantExcerpt(doc.fullText, dto.query),
      }));

      const executionTime = Date.now() - startTime;
      this.logger.log(`Semantic search completed in ${executionTime}ms with ${results.length} results`);

      // 4. Record search analytics
      searchQueryId = await this.analyticsService.recordSearchQuery({
        userId,
        query: dto.query,
        totalResults: results.length,
        hasResults: results.length > 0,
        executionTimeMs: executionTime,
      });

      return {
        results,
        total: results.length,
        query: dto.query,
        executionTime,
        searchType: 'semantic',
        searchQueryId,
      };
    } catch (error) {
      this.logger.error('Error performing semantic search:', error);

      // Record failed search
      const executionTime = Date.now() - startTime;
      await this.analyticsService.recordSearchQuery({
        userId,
        query: dto.query,
        totalResults: 0,
        hasResults: false,
        executionTimeMs: executionTime,
      });

      throw error;
    }
  }

  /**
   * Extract relevant excerpt from fullText (simple implementation)
   * In production, this could use more sophisticated text extraction
   */
  private extractRelevantExcerpt(fullText: string | null, query: string): string | undefined {
    if (!fullText) return undefined;

    const maxExcerptLength = 300;
    const queryLower = query.toLowerCase();
    const textLower = fullText.toLowerCase();

    // Find first occurrence of any word from query
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    let bestIndex = -1;

    for (const word of queryWords) {
      const index = textLower.indexOf(word);
      if (index !== -1) {
        bestIndex = index;
        break;
      }
    }

    if (bestIndex === -1) {
      // No match found, return beginning
      return fullText.substring(0, maxExcerptLength) + '...';
    }

    // Extract context around the match
    const startIndex = Math.max(0, bestIndex - 100);
    const endIndex = Math.min(fullText.length, bestIndex + 200);
    let excerpt = fullText.substring(startIndex, endIndex);

    if (startIndex > 0) excerpt = '...' + excerpt;
    if (endIndex < fullText.length) excerpt = excerpt + '...';

    return excerpt;
  }
}
