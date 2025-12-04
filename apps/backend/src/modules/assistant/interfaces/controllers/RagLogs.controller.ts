import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/guards/JwtAuth.guard';
import { RolesGuard } from '../../../../shared/guards/Roles.guard';
import { Roles } from '../../../../shared/decorators/Roles.decorator';
import { Role } from '../../../user/domain/entities/User.entity';
import { RagTelemetryService, RagLogEntry } from '../../application/services';
import { StructuredLogger } from '../../../../infrastructure/logging';

/**
 * Response DTO for paginated RAG logs
 */
interface RagLogsResponseDto {
  logs: RagLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * RagLogs Controller - Admin Audit Endpoint for RAG Queries
 *
 * This controller provides administrative access to RAG query logs
 * for monitoring, auditing, and debugging purposes.
 *
 * Access: SUPER_ADMIN and ADMIN only
 *
 * @endpoint GET /api/admin/rag-logs - List recent RAG queries
 */
@Controller('admin/rag-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RagLogsController {
  private readonly logger = new StructuredLogger('RagLogsController');

  constructor(private readonly telemetryService: RagTelemetryService) {}

  /**
   * GET /api/admin/rag-logs
   *
   * Retrieve paginated list of RAG query logs for audit purposes.
   *
   * Features:
   * - Pagination with limit and offset
   * - Filter by userId (optional)
   * - Returns metrics and sources, NOT full answers
   *
   * Security:
   * - Requires authentication (JWT)
   * - Requires SUPER_ADMIN or ADMIN role
   * - Full answers are never returned (privacy)
   *
   * @param limit - Maximum number of logs to return (default: 50, max: 100)
   * @param offset - Number of logs to skip (default: 0)
   * @param userId - Filter by user ID (optional)
   * @returns Paginated list of RAG logs
   *
   * @example
   * GET /api/admin/rag-logs?limit=20&offset=0
   *
   * Response:
   * ```json
   * {
   *   "logs": [
   *     {
   *       "id": "...",
   *       "createdAt": "2024-01-15T10:30:00Z",
   *       "query": "¿Cuáles son los requisitos...",
   *       "sources": [...],
   *       "metrics": {...},
   *       "answerSummary": "Según la normativa..."
   *     }
   *   ],
   *   "total": 150,
   *   "limit": 20,
   *   "offset": 0
   * }
   * ```
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getLogs(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('userId') userId?: string,
  ): Promise<RagLogsResponseDto> {
    // Enforce maximum limit
    const effectiveLimit = Math.min(limit, 100);

    this.logger.log('Fetching RAG logs', {
      limit: effectiveLimit,
      offset,
      hasUserFilter: !!userId,
    });

    const [logs, total] = await Promise.all([
      this.telemetryService.getRecentLogs({
        limit: effectiveLimit,
        offset,
        userId,
      }),
      this.telemetryService.getLogsCount(userId),
    ]);

    this.logger.log('RAG logs fetched', {
      count: logs.length,
      total,
    });

    return {
      logs,
      total,
      limit: effectiveLimit,
      offset,
    };
  }
}
