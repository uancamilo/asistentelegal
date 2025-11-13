import { Module } from '@nestjs/common';
import { OpenAIModule } from '../../shared/openai/OpenAI.module';
import { DocumentModule } from '../document/document.module';
import { RateLimitingModule } from '../../shared/rate-limiting/rate-limiting.module';

// Controllers
import { SearchController } from './interfaces/controllers/Search.controller';
import { SearchAnalyticsController } from './interfaces/controllers/SearchAnalytics.controller';

// Use Cases
import { VectorSearchUseCase } from './application/use-cases/VectorSearch.usecase';
import { HybridSearchUseCase } from './application/use-cases/HybridSearch.usecase';

// Services
import { SearchAnalyticsService } from './application/services/SearchAnalytics.service';

/**
 * Search Module
 *
 * Provides semantic and hybrid search capabilities for documents
 *
 * Features:
 * - Semantic search using OpenAI embeddings
 * - Hybrid search combining vector similarity and keyword matching
 * - Configurable scoring weights
 * - Rate limiting for search endpoints
 *
 * Dependencies:
 * - OpenAIModule: For generating query embeddings
 * - DocumentModule: For accessing document repository
 */
@Module({
  imports: [
    OpenAIModule,
    DocumentModule, // Provides DOCUMENT_REPOSITORY
    RateLimitingModule, // Provides RedisRateLimiterService and RedisThrottlerGuard
  ],
  controllers: [SearchController, SearchAnalyticsController],
  providers: [
    VectorSearchUseCase,
    HybridSearchUseCase,
    SearchAnalyticsService,
  ],
  exports: [
    VectorSearchUseCase,
    HybridSearchUseCase,
    SearchAnalyticsService,
  ],
})
export class SearchModule {}
