import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/JwtAuth.guard';
import { RedisThrottlerGuard } from '../rate-limiting/redis-throttler.guard';
import { CurrentUser } from '../decorators/CurrentUser.decorator';
import { UserEntity } from '../../modules/user/domain/entities/User.entity';
import { GetAuditLogsUseCase } from './application/use-cases/GetAuditLogs/GetAuditLogs.use-case';
import {
  GetAuditLogsRequestDto,
  GetAuditLogsResponseDto,
} from './application/use-cases/GetAuditLogs/GetAuditLogs.dto';

/**
 * Controlador de auditoría
 *
 * Endpoints:
 * - GET /api/audit-logs - Obtener logs de auditoría (solo SUPER_ADMIN)
 *
 * Reglas de seguridad:
 * - Requiere autenticación JWT
 * - Rate limiting distribuido con Redis: 20 req/min por IP
 */
@Controller('audit-logs')
@Throttle({ default: { limit: 20, ttl: 60000 } })
@UseGuards(RedisThrottlerGuard, JwtAuthGuard)
export class AuditController {
  constructor(private readonly getAuditLogsUseCase: GetAuditLogsUseCase) {}

  /**
   * GET /api/audit-logs
   *
   * Obtiene logs de auditoría con filtros y paginación
   * Solo accesible por SUPER_ADMIN
   *
   * Query params:
   * - userId: filtrar por usuario
   * - action: filtrar por acción (CREATE, UPDATE, DELETE, etc.)
   * - resource: filtrar por recurso (ACCOUNT, USER, etc.)
   * - resourceId: filtrar por ID de recurso
   * - success: filtrar por éxito/fallo
   * - startDate: fecha inicio (ISO 8601)
   * - endDate: fecha fin (ISO 8601)
   * - limit: número de registros (default 100, max 1000)
   * - offset: offset de paginación (default 0)
   */
  @Get()
  async getAuditLogs(
    @Query() dto: GetAuditLogsRequestDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<GetAuditLogsResponseDto> {
    return this.getAuditLogsUseCase.execute(dto, currentUser);
  }
}
