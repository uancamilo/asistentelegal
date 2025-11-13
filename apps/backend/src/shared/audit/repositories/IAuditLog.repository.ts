import { AuditLogEntity } from '../entities/AuditLog.entity';
import { AuditAction } from '../enums/AuditAction.enum';
import { AuditResource } from '../enums/AuditResource.enum';

/**
 * DTO para crear un log de auditoría
 */
export interface CreateAuditLogDto {
  userId: string;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  resourceName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Filtros para buscar logs de auditoría
 */
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Interfaz del repositorio de logs de auditoría
 */
export interface IAuditLogRepository {
  /**
   * Crea un nuevo log de auditoría
   */
  create(data: CreateAuditLogDto): Promise<AuditLogEntity>;

  /**
   * Busca logs con filtros
   */
  find(filters: AuditLogFilters): Promise<AuditLogEntity[]>;

  /**
   * Cuenta logs que coinciden con los filtros
   */
  count(filters: Omit<AuditLogFilters, 'limit' | 'offset'>): Promise<number>;

  /**
   * Busca un log por ID
   */
  findById(id: string): Promise<AuditLogEntity | null>;

  /**
   * Busca logs por usuario
   */
  findByUserId(userId: string, limit?: number): Promise<AuditLogEntity[]>;

  /**
   * Busca logs por recurso
   */
  findByResource(
    resource: AuditResource,
    resourceId: string,
    limit?: number
  ): Promise<AuditLogEntity[]>;
}
