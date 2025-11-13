import { AuditAction } from '../enums/AuditAction.enum';
import { AuditResource } from '../enums/AuditResource.enum';

/**
 * Entidad de dominio para logs de auditoría
 */
export class AuditLogEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly userRole: string,
    public readonly action: AuditAction,
    public readonly resource: AuditResource,
    public readonly resourceId: string,
    public readonly resourceName: string | null,
    public readonly details: Record<string, any> | null,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly success: boolean,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date
  ) {}

  /**
   * Crea una nueva instancia de AuditLogEntity desde datos de Prisma
   */
  static fromPrisma(prismaAuditLog: any): AuditLogEntity {
    return new AuditLogEntity(
      prismaAuditLog.id,
      prismaAuditLog.userId,
      prismaAuditLog.userEmail,
      prismaAuditLog.userRole,
      prismaAuditLog.action as AuditAction,
      prismaAuditLog.resource as AuditResource,
      prismaAuditLog.resourceId,
      prismaAuditLog.resourceName,
      prismaAuditLog.details,
      prismaAuditLog.ipAddress,
      prismaAuditLog.userAgent,
      prismaAuditLog.success,
      prismaAuditLog.errorMessage,
      prismaAuditLog.createdAt
    );
  }

  /**
   * Verifica si el log representa un acceso denegado
   */
  isAccessDenied(): boolean {
    return this.action === AuditAction.ACCESS_DENIED;
  }

  /**
   * Verifica si el log fue exitoso
   */
  isSuccessful(): boolean {
    return this.success;
  }

  /**
   * Obtiene una representación legible de la acción
   */
  getActionDescription(): string {
    const actionMap: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'Creación',
      [AuditAction.UPDATE]: 'Actualización',
      [AuditAction.DELETE]: 'Eliminación',
      [AuditAction.VIEW]: 'Visualización',
      [AuditAction.ACCESS_DENIED]: 'Acceso denegado',
      [AuditAction.ACCESS_GRANTED]: 'Acceso otorgado',
      [AuditAction.LOGIN]: 'Inicio de sesión',
      [AuditAction.LOGOUT]: 'Cierre de sesión',
      [AuditAction.REFRESH_TOKEN]: 'Renovación de token',
    };

    return actionMap[this.action] || this.action;
  }
}
