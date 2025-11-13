import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../shared/guards/JwtAuth.guard';
import { RedisThrottlerGuard } from '../../../../shared/rate-limiting/redis-throttler.guard';
import { CurrentUser } from '../../../../shared/decorators/CurrentUser.decorator';
import { UserEntity } from '../../../user/domain/entities/User.entity';

// Use Cases
import { VectorSearchUseCase } from '../../application/use-cases/VectorSearch.usecase';
import { HybridSearchUseCase } from '../../application/use-cases/HybridSearch.usecase';

// DTOs
import {
  SemanticSearchDto,
  HybridSearchDto,
  SearchResponseDto,
} from '../../application/dtos/Search.dto';

/**
 * Search Controller
 *
 * Endpoints:
 * - POST /api/search/semantic    - Semantic vector search
 * - POST /api/search/hybrid      - Hybrid search (semantic + keyword)
 *
 * Access Control:
 * - All authenticated users can search
 * - Rate limited to prevent abuse
 *
 * Note: Search only returns PUBLISHED documents
 *
 * SECURITY FIX (P2.14): Stricter rate limiting for search operations
 * - 10 req/min (reduced from 20) to limit OpenAI API costs
 * - Vector similarity searches are computationally expensive
 * - Each search generates embeddings via OpenAI API ($$$)
 */
@Controller('search')
@UseGuards(RedisThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute (SECURITY FIX P2.14)
export class SearchController {
  constructor(
    private readonly vectorSearchUseCase: VectorSearchUseCase,
    private readonly hybridSearchUseCase: HybridSearchUseCase,
  ) {}

  /**
   * POST /api/search/semantic
   * Semantic search using vector embeddings
   *
   * Authorization: Authenticated users
   *
   * Uses OpenAI embeddings + pgvector similarity search
   */
  @Post('semantic')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async semanticSearch(
    @Body() dto: SemanticSearchDto,
    @CurrentUser() user: UserEntity,
  ): Promise<SearchResponseDto> {
    return this.vectorSearchUseCase.execute(dto, user.id);
  }

  /**
   * POST /api/search/hybrid
   * Hybrid search combining semantic and keyword search
   *
   * Authorization: Authenticated users
   *
   * Combines:
   * - Vector similarity (semantic understanding)
   * - Keyword matching (exact/fuzzy text search)
   * - Weighted scoring for best results
   */
  @Post('hybrid')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async hybridSearch(
    @Body() dto: HybridSearchDto,
    @CurrentUser() user: UserEntity,
  ): Promise<SearchResponseDto> {
    return this.hybridSearchUseCase.execute(dto, user.id);
  }

  /**
   * POST /api/search/analytics/click
   * Record a click on a search result for analytics
   *
   * DISABLED: Click tracking functionality removed
   * The search_query_clicks table was removed from the database
   */
  // @Post('analytics/click')
  // @UseGuards(JwtAuthGuard)
  // @HttpCode(HttpStatus.OK)
  // @Throttle({ default: { limit: 50, ttl: 60000 } })
  // async recordClick(
  //   @Body() dto: RecordClickDto,
  // ): Promise<{ success: boolean }> {
  //   // Click tracking disabled
  //   return { success: true };
  // }
}
