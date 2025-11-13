import { Injectable, Inject } from '@nestjs/common';
import { UserEntity } from '../../modules/user/domain/entities/User.entity';
import { AuditLogEntity } from './entities/AuditLog.entity';
import { AuditAction } from './enums/AuditAction.enum';
import { AuditResource } from './enums/AuditResource.enum';
import {
  IAuditLogRepository,
  AuditLogFilters,
} from './repositories/IAuditLog.repository';
import { SecureLogger } from '../logging/secure-logger.util';

export const AUDIT_LOG_REPOSITORY = Symbol('IAuditLogRepository');

/**
 * Servicio de auditoría para registrar acciones en el sistema
 */
@Injectable()
export class AuditService {
  private readonly logger = new SecureLogger(AuditService.name);

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  /**
   * Registra una acción exitosa en el sistema
   *
   * @param user - Usuario que realiza la acción
   * @param action - Tipo de acción
   * @param resource - Tipo de recurso
   * @param resourceId - ID del recurso
   * @param resourceName - Nombre del recurso (opcional)
   * @param details - Detalles adicionales (opcional)
   * @param ipAddress - Dirección IP (opcional)
   * @param userAgent - User agent (opcional)
   */
  async log(
    user: UserEntity,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    resourceName?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLogEntity> {
    try {
      const auditLog = await this.auditLogRepository.create({
        userId: user.id,
        userEmail: user.email.getValue(), // Convert Email VO to string
        userRole: user.role,
        action,
        resource,
        resourceId,
        resourceName,
        details,
        ipAddress,
        userAgent,
        success: true,
      });

      // SECURITY: Sanitize email to comply with GDPR/CCPA
      this.logger.audit(user.id, user.email.getValue(), action, resource, resourceId);

      return auditLog;
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      // SECURITY: Sanitize stack trace in production
      this.logger.error(
        `Failed to create audit log: ${errorInstance.message}`,
        errorInstance
      );
      throw error;
    }
  }

  /**
   * Registra un acceso denegado
   *
   * @param user - Usuario que intenta la acción
   * @param resource - Tipo de recurso
   * @param resourceId - ID del recurso
   * @param resourceName - Nombre del recurso (opcional)
   * @param reason - Razón del rechazo
   * @param ipAddress - Dirección IP (opcional)
   * @param userAgent - User agent (opcional)
   */
  async logAccessDenied(
    user: UserEntity,
    resource: AuditResource,
    resourceId: string,
    resourceName: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLogEntity> {
    try {
      const auditLog = await this.auditLogRepository.create({
        userId: user.id,
        userEmail: user.email.getValue(), // Convert Email VO to string
        userRole: user.role,
        action: AuditAction.ACCESS_DENIED,
        resource,
        resourceId,
        resourceName,
        details: { reason },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: reason,
      });

      // SECURITY: Sanitize email to comply with GDPR/CCPA
      this.logger.accessDenied(user.id, user.email.getValue(), resource, resourceId, reason);

      return auditLog;
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      // SECURITY: Sanitize stack trace in production
      this.logger.error(
        `Failed to log access denied: ${errorInstance.message}`,
        errorInstance
      );
      throw error;
    }
  }

  /**
   * Registra un error en una acción
   *
   * @param user - Usuario que realiza la acción
   * @param action - Tipo de acción
   * @param resource - Tipo de recurso
   * @param resourceId - ID del recurso
   * @param errorMessage - Mensaje de error
   * @param details - Detalles adicionales (opcional)
   * @param ipAddress - Dirección IP (opcional)
   * @param userAgent - User agent (opcional)
   */
  async logError(
    user: UserEntity,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    errorMessage: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLogEntity> {
    try {
      const auditLog = await this.auditLogRepository.create({
        userId: user.id,
        userEmail: user.email.getValue(), // Convert Email VO to string
        userRole: user.role,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        success: false,
        errorMessage,
      });

      // SECURITY: Sanitize email to comply with GDPR/CCPA
      const sanitizedEmail = user.id ? `user:${user.id}` : user.email.getValue();
      this.logger.error(
        `[AUDIT] ERROR: ${sanitizedEmail} (${user.role}) failed ${action} on ${resource}:${resourceId} - ${errorMessage}`
      );

      return auditLog;
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      // SECURITY: Sanitize stack trace in production
      this.logger.error(`Failed to log error: ${errorInstance.message}`, errorInstance);
      throw error;
    }
  }

  /**
   * Registra un intento de autenticación fallido sin usuario autenticado
   * Se usa para login fallido, JWT inválido, token expirado, etc.
   *
   * @param email - Email del usuario (si se conoce)
   * @param action - Tipo de acción (LOGIN, REFRESH_TOKEN, etc.)
   * @param reason - Razón del fallo
   * @param ipAddress - Dirección IP (opcional)
   * @param userAgent - User agent (opcional)
   * @param details - Detalles adicionales (opcional)
   */
  async logAuthenticationFailure(
    email: string,
    action: AuditAction,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<AuditLogEntity> {
    try {
      const auditLog = await this.auditLogRepository.create({
        userId: 'unknown',
        userEmail: email || 'unknown',
        userRole: 'unknown',
        action,
        resource: AuditResource.AUTH,
        resourceId: 'auth-failure',
        resourceName: 'Authentication Failure',
        details: { reason, ...details },
        ipAddress,
        userAgent,
        success: false,
        errorMessage: reason,
      });

      // SECURITY: Sanitize email and IP to comply with GDPR/CCPA
      this.logger.authFailure(email, action, reason, ipAddress);

      return auditLog;
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      // SECURITY: Sanitize stack trace in production
      this.logger.error(
        `Failed to log authentication failure: ${errorInstance.message}`,
        errorInstance
      );
      throw error;
    }
  }

  /**
   * Obtiene logs de auditoría con filtros
   *
   * @param filters - Filtros para buscar logs
   * @returns Lista de logs de auditoría
   */
  async getAuditLogs(filters: AuditLogFilters): Promise<{
    logs: AuditLogEntity[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    const page = Math.floor(offset / limit) + 1;

    const [logs, total] = await Promise.all([
      this.auditLogRepository.find(filters),
      this.auditLogRepository.count(filters),
    ]);

    return {
      logs,
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * Obtiene logs de un usuario específico
   *
   * @param userId - ID del usuario
   * @param limit - Cantidad de logs a obtener
   * @returns Lista de logs del usuario
   */
  async getUserLogs(
    userId: string,
    limit: number = 50
  ): Promise<AuditLogEntity[]> {
    return await this.auditLogRepository.findByUserId(userId, limit);
  }

  /**
   * Obtiene logs de un recurso específico
   *
   * @param resource - Tipo de recurso
   * @param resourceId - ID del recurso
   * @param limit - Cantidad de logs a obtener
   * @returns Lista de logs del recurso
   */
  async getResourceLogs(
    resource: AuditResource,
    resourceId: string,
    limit: number = 50
  ): Promise<AuditLogEntity[]> {
    return await this.auditLogRepository.findByResource(
      resource,
      resourceId,
      limit
    );
  }
}
