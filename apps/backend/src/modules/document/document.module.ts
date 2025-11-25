import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Infrastructure
import { PrismaModule } from '../../database/prisma.module';
import { OpenAIModule } from '../../shared/openai/OpenAI.module';
import { StorageModule } from '../../shared/storage/Storage.module';
import { RateLimitingModule } from '../../shared/rate-limiting/rate-limiting.module';
import { QueueModule } from '../../shared/queue/queue.module';

// Repositories
import { PrismaDocumentRepository } from './infrastructure/repositories/PrismaDocument.repository';
import { PrismaDocumentFileRepository } from './infrastructure/repositories/PrismaDocumentFile.repository';

// Processors (BullMQ workers)
import { DocumentProcessor } from './infrastructure/processors/document.processor';

// Domain tokens
import {
  DOCUMENT_REPOSITORY,
  DOCUMENT_FILE_REPOSITORY,
} from './domain/constants/tokens';

// Use Cases
import { CreateDocumentUseCase } from './application/use-cases/CreateDocument/CreateDocument.usecase';
import { GetDocumentUseCase } from './application/use-cases/GetDocument/GetDocument.usecase';
import { ListDocumentsUseCase } from './application/use-cases/ListDocuments/ListDocuments.usecase';
import { UpdateDocumentUseCase } from './application/use-cases/UpdateDocument/UpdateDocument.usecase';
import { PublishDocumentUseCase } from './application/use-cases/PublishDocument/PublishDocument.usecase';
import { ImportDocumentFromUrlUseCase } from './application/use-cases/ImportDocumentFromUrl';

// Controllers
import { DocumentController } from './interfaces/controllers/Document.controller';

/**
 * Document Module - Legal Document Management System
 *
 * This module implements the complete document management system for legal documents:
 * - Document CRUD operations
 * - File upload and processing (PDF)
 * - Semantic search with embeddings
 * - Document versioning and relations
 * - Publication workflow
 * - Access control (public/authenticated/editor)
 *
 * Architecture:
 * - Domain Layer: Entities, repositories interfaces
 * - Application Layer: Use cases, DTOs
 * - Infrastructure Layer: Prisma repositories, external services
 * - Interface Layer: REST controllers
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - OpenAIModule: Embeddings generation
 * - StorageModule: File storage
 * - RateLimitingModule: API rate limiting
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    OpenAIModule,
    StorageModule,
    RateLimitingModule,
    QueueModule,
  ],
  controllers: [DocumentController],
  providers: [
    // Repositories
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: PrismaDocumentRepository,
    },
    {
      provide: DOCUMENT_FILE_REPOSITORY,
      useClass: PrismaDocumentFileRepository,
    },
    // Use Cases
    CreateDocumentUseCase,
    GetDocumentUseCase,
    ListDocumentsUseCase,
    UpdateDocumentUseCase,
    PublishDocumentUseCase,
    ImportDocumentFromUrlUseCase,
    // Processors (BullMQ workers)
    DocumentProcessor,
  ],
  exports: [
    DOCUMENT_REPOSITORY,
    DOCUMENT_FILE_REPOSITORY,
    CreateDocumentUseCase,
    GetDocumentUseCase,
    ListDocumentsUseCase,
  ],
})
export class DocumentModule {}
