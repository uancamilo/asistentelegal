import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../database/prisma.service';
import { StructuredLogger } from '../../../../infrastructure/logging';

/**
 * Source reference used in RAG response
 */
export interface RagSourceInfo {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
  snippetLength: number;
}

/**
 * Timing metrics for RAG pipeline stages
 */
export interface RagTimingMetrics {
  embeddingMs: number;
  vectorSearchMs: number;
  contextBuildMs: number;
  llmResponseMs: number;
  totalMs: number;
}

/**
 * Context metrics from chunk retrieval
 */
export interface RagContextMetrics {
  chunksFound: number;
  chunksUsed: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  contextLengthChars: number;
}

/**
 * Complete telemetry data for a RAG query
 */
export interface RagTelemetryData {
  // Query info
  queryOriginal: string;
  queryNormalized?: string;

  // Request context (optional)
  userId?: string;
  ip?: string;
  userAgent?: string;

  // Timing metrics
  timing: RagTimingMetrics;

  // Context metrics
  context: RagContextMetrics;

  // Sources used
  sources: RagSourceInfo[];

  // Answer summary (truncated for privacy)
  answerSummary: string;

  // Status
  success: boolean;
  errorMessage?: string;
}

/**
 * RagTelemetryService - Observability for the RAG pipeline
 *
 * This service provides:
 * - Structured JSON logging of RAG queries
 * - Optional persistence to database (rag_logs table)
 * - Timing and performance metrics
 * - Source attribution tracking
 *
 * Configuration:
 * - ASSISTANT_LOG_TO_DB=true: Enable database persistence
 * - ASSISTANT_LOG_LEVEL=debug: Set log verbosity
 *
 * Privacy considerations:
 * - Full answers are NOT stored (only truncated summary)
 * - IPs are treated as semi-sensitive (optional storage)
 * - User queries are stored for analytics
 */
@Injectable()
export class RagTelemetryService {
  private readonly logger = new StructuredLogger('RagTelemetry');
  private readonly logToDb: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.logToDb = this.configService.get<string>('ASSISTANT_LOG_TO_DB') === 'true';

    if (this.logToDb) {
      this.logger.log('RAG telemetry database logging enabled');
    }
  }

  /**
   * Log RAG query telemetry
   *
   * This method:
   * 1. Always logs to console in JSON format
   * 2. Optionally persists to database if ASSISTANT_LOG_TO_DB=true
   *
   * @param data - Complete telemetry data for the RAG query
   */
  async log(data: RagTelemetryData): Promise<void> {
    // Always log to console
    this.logToConsole(data);

    // Optionally persist to database
    if (this.logToDb) {
      await this.logToDatabase(data);
    }
  }

  /**
   * Log telemetry data to console in structured JSON format
   */
  private logToConsole(data: RagTelemetryData): void {
    const logData = {
      // Query
      query: data.queryOriginal.substring(0, 200),
      queryLength: data.queryOriginal.length,

      // Timing
      embeddingMs: data.timing.embeddingMs,
      vectorSearchMs: data.timing.vectorSearchMs,
      contextBuildMs: data.timing.contextBuildMs,
      llmResponseMs: data.timing.llmResponseMs,
      totalMs: data.timing.totalMs,

      // Context metrics
      chunksFound: data.context.chunksFound,
      chunksUsed: data.context.chunksUsed,
      avgScore: Math.round(data.context.avgScore * 1000) / 1000,
      maxScore: Math.round(data.context.maxScore * 1000) / 1000,
      minScore: Math.round(data.context.minScore * 1000) / 1000,
      contextChars: data.context.contextLengthChars,

      // Sources count
      sourcesCount: data.sources.length,

      // Status
      success: data.success,
      ...(data.errorMessage && { error: data.errorMessage }),

      // Optional user context
      ...(data.userId && { userId: data.userId }),
    };

    if (data.success) {
      this.logger.log('RAG query processed', logData);
    } else {
      this.logger.error('RAG query failed', undefined, logData);
    }
  }

  /**
   * Persist telemetry data to database
   */
  private async logToDatabase(data: RagTelemetryData): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO "rag_logs" (
          "id",
          "createdAt",
          "query",
          "sources",
          "metrics",
          "answerSummary",
          "ip",
          "userId"
        ) VALUES (
          gen_random_uuid(),
          NOW(),
          ${data.queryOriginal},
          ${JSON.stringify(data.sources)}::jsonb,
          ${JSON.stringify({
            timing: data.timing,
            context: data.context,
          })}::jsonb,
          ${data.answerSummary},
          ${data.ip || null},
          ${data.userId || null}
        )
      `;

      this.logger.debug('RAG telemetry persisted to database');
    } catch (error) {
      // Don't fail the request if logging fails
      this.logger.warn('Failed to persist RAG telemetry to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Query recent RAG logs from database
   *
   * @param options - Query options
   * @returns Array of RAG log entries
   */
  async getRecentLogs(options: {
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}): Promise<RagLogEntry[]> {
    const { limit = 50, offset = 0, userId } = options;

    try {
      const logs = await this.prisma.$queryRaw<RagLogEntry[]>`
        SELECT
          "id",
          "createdAt",
          "query",
          "sources",
          "metrics",
          "answerSummary",
          "userId"
        FROM "rag_logs"
        ${userId ? this.prisma.$queryRaw`WHERE "userId" = ${userId}` : this.prisma.$queryRaw``}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return logs;
    } catch (error) {
      this.logger.error('Failed to query RAG logs', undefined, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get total count of RAG logs
   */
  async getLogsCount(userId?: string): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM "rag_logs"
        ${userId ? this.prisma.$queryRaw`WHERE "userId" = ${userId}` : this.prisma.$queryRaw``}
      `;

      return Number(result[0]?.count || 0);
    } catch (error) {
      this.logger.warn('Failed to count RAG logs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Calculate statistics from telemetry data
   */
  calculateMetrics(sources: Array<{ score: number }>): {
    avgScore: number;
    maxScore: number;
    minScore: number;
  } {
    if (sources.length === 0) {
      return { avgScore: 0, maxScore: 0, minScore: 0 };
    }

    const scores = sources.map((s) => s.score);
    const sum = scores.reduce((a, b) => a + b, 0);

    return {
      avgScore: sum / scores.length,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
    };
  }

  /**
   * Create a truncated answer summary for storage
   * Avoids storing full legal responses for privacy
   */
  createAnswerSummary(answer: string, maxLength = 150): string {
    if (answer.length <= maxLength) {
      return answer;
    }

    const truncated = answer.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }
}

/**
 * RAG log entry from database
 */
export interface RagLogEntry {
  id: string;
  createdAt: Date;
  query: string;
  sources: RagSourceInfo[];
  metrics: {
    timing: RagTimingMetrics;
    context: RagContextMetrics;
  };
  answerSummary: string;
  userId?: string;
}
