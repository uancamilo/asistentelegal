import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { IAuditLogRepository } from '../../../repositories/IAuditLog.repository';
import { AUDIT_LOG_REPOSITORY } from '../../../audit.service';
import { UserEntity, Role } from '../../../../../modules/user/domain/entities/User.entity';
import {
  GetAuditLogsRequestDto,
  GetAuditLogsResponseDto,
  AuditLogResponseDto,
} from './GetAuditLogs.dto';

/**
 * Caso de uso: Obtener logs de auditoría
 *
 * Reglas de negocio:
 * - Solo SUPER_ADMIN puede acceder a los logs de auditoría
 * - Soporta filtros: userId, action, resource, resourceId, success, startDate, endDate
 * - Paginación: limit (default 100, max 1000), offset (default 0)
 * - Retorna lista de logs con total count para paginación
 */
@Injectable()
export class GetAuditLogsUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async execute(
    dto: GetAuditLogsRequestDto,
    currentUser: UserEntity,
  ): Promise<GetAuditLogsResponseDto> {
    // Autorización: Solo SUPER_ADMIN
    if (currentUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        `Only SUPER_ADMIN can access audit logs`,
      );
    }

    // Construir filtros
    const filters = {
      userId: dto.userId,
      action: dto.action,
      resource: dto.resource,
      resourceId: dto.resourceId,
      success: dto.success,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      limit: dto.limit || 100,
      offset: dto.offset || 0,
    };

    // Obtener logs y total count
    const [logs, total] = await Promise.all([
      this.auditLogRepository.find(filters),
      this.auditLogRepository.count({
        userId: filters.userId,
        action: filters.action,
        resource: filters.resource,
        resourceId: filters.resourceId,
        success: filters.success,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    ]);

    // Mapear a DTO de respuesta
    const logsDto: AuditLogResponseDto[] = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      userRole: log.userRole,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      resourceName: log.resourceName,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      success: log.success,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt,
    }));

    return {
      logs: logsDto,
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }
}
