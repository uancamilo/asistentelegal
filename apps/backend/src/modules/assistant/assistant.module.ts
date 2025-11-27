import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Infrastructure
import { PrismaModule } from '../../database/prisma.module';
import { OpenAIModule } from '../../shared/openai/OpenAI.module';
import { RateLimitingModule } from '../../shared/rate-limiting/rate-limiting.module';

// Repositories from Document module (shared)
import { PrismaDocumentChunkRepository } from '../document/infrastructure/repositories/PrismaDocumentChunk.repository';
import { DOCUMENT_CHUNK_REPOSITORY } from '../document/domain/constants/tokens';

// Services
import { RagTelemetryService } from './application/services';

// Use Cases
import { AskAssistantUseCase } from './application/use-cases/AskAssistant';

// Controllers
import { AssistantController } from './interfaces/controllers/Assistant.controller';
import { RagLogsController } from './interfaces/controllers/RagLogs.controller';

/**
 * Assistant Module - Legal AI Assistant System
 *
 * This module implements the RAG (Retrieval Augmented Generation) system
 * for answering legal questions based on published documents.
 *
 * Features:
 * - Semantic search across published documents
 * - Context-aware AI responses
 * - Source citations and references
 * - Rate limiting for abuse prevention
 * - Full telemetry and observability
 * - Admin audit endpoint for RAG queries
 *
 * Architecture:
 * - Uses Document module's chunk repository for vector search
 * - Uses OpenAI for embeddings and chat completions
 * - Exposes REST API for question answering
 * - RagTelemetryService for logging and metrics
 *
 * Dependencies:
 * - PrismaModule: Database access for chunk repository and rag_logs
 * - OpenAIModule: AI model access (embeddings + chat)
 * - RateLimitingModule: API rate limiting
 *
 * Environment Variables:
 * - ASSISTANT_LOG_TO_DB: Enable database logging (default: false)
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    OpenAIModule,
    RateLimitingModule,
  ],
  controllers: [AssistantController, RagLogsController],
  providers: [
    // Repository (shared with Document module)
    {
      provide: DOCUMENT_CHUNK_REPOSITORY,
      useClass: PrismaDocumentChunkRepository,
    },
    // Services
    RagTelemetryService,
    // Use Cases
    AskAssistantUseCase,
  ],
  exports: [AskAssistantUseCase, RagTelemetryService],
})
export class AssistantModule {}
