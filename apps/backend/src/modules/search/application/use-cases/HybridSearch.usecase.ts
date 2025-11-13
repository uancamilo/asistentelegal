import { Injectable, Inject, Logger } from '@nestjs/common';
import { OpenAIService } from '../../../../shared/openai/OpenAI.service';
import { DOCUMENT_REPOSITORY } from '../../../document/domain/constants/tokens';
import { IDocumentRepository } from '../../../document/domain/repositories/Document.repository.interface';
import { HybridSearchDto, SearchResultDto, SearchResponseDto } from '../dtos/Search.dto';
import { SearchAnalyticsService } from '../services/SearchAnalytics.service';

/**
 * Hybrid Search Use Case
 *
 * Combines semantic search (vector similarity) with traditional keyword search
 *
 * Flow:
 * 1. Perform semantic search with embeddings
 * 2. Perform keyword search on title, summary, fullText
 * 3. Merge results with weighted scoring
 * 4. Re-rank by combined relevance score
 */
@Injectable()
export class HybridSearchUseCase {
  private readonly logger = new Logger(HybridSearchUseCase.name);

  constructor(
    private readonly openaiService: OpenAIService,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    private readonly analyticsService: SearchAnalyticsService,
  ) {}

  async execute(dto: HybridSearchDto, userId: string): Promise<SearchResponseDto> {
    const startTime = Date.now();
    let openaiLatencyMs: number | undefined;
    let pgvectorLatencyMs: number | undefined;
    let searchQueryId = '';

    try {
      this.logger.debug(`Starting hybrid search for query: "${dto.query}"`);

      // Weights for combining scores (configurable via DTO)
      const semanticWeight = dto.semanticWeight ?? 0.7;
      const keywordWeight = 1 - semanticWeight;

      // 1. Semantic search with embeddings
      const embeddingStart = Date.now();
      const queryEmbedding = await this.openaiService.generateEmbedding(dto.query);
      openaiLatencyMs = Date.now() - embeddingStart;
      this.logger.debug(`Query embedding generated in ${openaiLatencyMs}ms`);

      const pgvectorStart = Date.now();
      const semanticResults = await this.documentRepository.searchBySimilarity(
        queryEmbedding,
        {
          limit: dto.limit || 10,
          similarityThreshold: 0.5, // Lower threshold for hybrid
          type: dto.type,
          scope: dto.scope,
          onlyActive: dto.onlyActive !== false,
          onlyPublished: true,
        }
      );
      pgvectorLatencyMs = Date.now() - pgvectorStart;

      // 2. Keyword search (if enabled)
      let keywordResults: any[] = [];
      if (dto.includeKeywordSearch !== false) {
        keywordResults = await this.documentRepository.searchByKeywords(dto.query, {
          limit: dto.limit || 10,
          type: dto.type,
          scope: dto.scope,
          onlyActive: dto.onlyActive !== false,
          onlyPublished: true,
        });
      }

      this.logger.debug(
        `Found ${semanticResults.length} semantic + ${keywordResults.length} keyword results in ${pgvectorLatencyMs}ms`
      );

      // 3. Merge and re-rank results
      const mergedResults = this.mergeAndRankResults(
        semanticResults,
        keywordResults,
        semanticWeight,
        keywordWeight,
        dto.query,
      );

      // 4. Limit to requested number
      const finalResults = mergedResults.slice(0, dto.limit || 10);

      const executionTime = Date.now() - startTime;
      this.logger.log(`Hybrid search completed in ${executionTime}ms with ${finalResults.length} results`);

      // 5. Record search analytics
      searchQueryId = await this.analyticsService.recordSearchQuery({
        userId,
        query: dto.query,
        totalResults: finalResults.length,
        hasResults: finalResults.length > 0,
        executionTimeMs: executionTime,
      });

      return {
        results: finalResults,
        total: finalResults.length,
        query: dto.query,
        executionTime,
        searchType: 'hybrid',
        searchQueryId,
      };
    } catch (error) {
      this.logger.error('Error performing hybrid search:', error);

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
   * Merge semantic and keyword results with weighted scoring
   */
  private mergeAndRankResults(
    semanticDocs: any[],
    keywordDocs: any[],
    semanticWeight: number,
    keywordWeight: number,
    query: string,
  ): SearchResultDto[] {
    const resultsMap = new Map<string, SearchResultDto>();

    // Process semantic results
    semanticDocs.forEach((doc) => {
      const semanticScore = doc.similarity || 0;
      resultsMap.set(doc.id, {
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
        similarity: semanticScore,
        relevanceScore: semanticScore * semanticWeight,
        matchType: 'semantic',
        excerpt: this.extractExcerpt(doc.fullText, query),
      });
    });

    // Process keyword results and merge
    keywordDocs.forEach((doc) => {
      const existing = resultsMap.get(doc.id);
      // Keyword score based on rank (1.0 for first result, decreasing)
      const keywordScore = doc.keywordScore || 0.8;

      if (existing) {
        // Document found in both searches - combine scores
        existing.relevanceScore += keywordScore * keywordWeight;
        existing.matchType = 'hybrid';
        existing.similarity = existing.similarity; // Keep semantic similarity
      } else {
        // Document only in keyword search
        resultsMap.set(doc.id, {
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
          similarity: 0, // No semantic similarity
          relevanceScore: keywordScore * keywordWeight,
          matchType: 'keyword',
          excerpt: this.extractExcerpt(doc.fullText, query),
        });
      }
    });

    // Sort by relevance score (descending)
    const results = Array.from(resultsMap.values()).sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );

    return results;
  }

  private extractExcerpt(fullText: string | null, query: string): string | undefined {
    if (!fullText) return undefined;

    const maxLength = 300;
    const queryLower = query.toLowerCase();
    const textLower = fullText.toLowerCase();

    // Find query match
    const index = textLower.indexOf(queryLower);
    if (index !== -1) {
      const start = Math.max(0, index - 100);
      const end = Math.min(fullText.length, index + 200);
      let excerpt = fullText.substring(start, end);

      if (start > 0) excerpt = '...' + excerpt;
      if (end < fullText.length) excerpt += '...';

      return excerpt;
    }

    // No direct match, return beginning
    return fullText.substring(0, maxLength) + '...';
  }
}
