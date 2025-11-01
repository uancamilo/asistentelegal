/**
 * Authorization Service
 *
 * Servicio centralizado para verificación de permisos basado en la matriz RBAC
 */

import { Injectable, Logger } from '@nestjs/common';
import { Role } from '../../modules/user/domain/entities/User.entity';
import { Action, Resource } from './permissions.constants';
import { hasPermission, getRolePermissions } from './permissions.matrix';

export interface PermissionContext {
  targetUserId?: string;
  targetAccountId?: string;
  targetRole?: Role;
  resourceOwnerId?: string;
  [key: string]: unknown;
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  /**
   * Verifica si un usuario con un rol específico puede realizar una acción
   *
   * @param userRole - Rol del usuario que intenta realizar la acción
   * @param action - Acción que se intenta realizar
   * @param context - Contexto adicional para validaciones específicas
   * @returns true si tiene permiso, false en caso contrario
   */
  can(userRole: Role, action: Action, context?: PermissionContext): boolean {
    // Verificación básica contra la matriz de permisos
    const hasBasePermission = hasPermission(userRole, action);

    if (!hasBasePermission) {
      this.logger.debug(`Permission denied: ${userRole} cannot perform ${action}`);
      return false;
    }

    // SUPER_ADMIN tiene acceso total sin restricciones adicionales
    if (userRole === Role.SUPER_ADMIN) {
      this.logger.debug(`Permission granted: SUPER_ADMIN has total access to ${action}`);
      return true;
    }

    // Validaciones adicionales específicas por contexto
    if (context) {
      return this.validateContextualPermissions(userRole, action, context);
    }

    this.logger.debug(`Permission granted: ${userRole} can perform ${action}`);
    return true;
  }

  /**
   * Valida permisos con contexto adicional
   * Permite verificaciones más granulares basadas en propietario, cuenta, etc.
   */
  private validateContextualPermissions(
    userRole: Role,
    action: Action,
    context: PermissionContext,
  ): boolean {
    // Ejemplo: ACCOUNT_OWNER solo puede crear MEMBER
    if (action === Action.CREATE_MEMBER && userRole === Role.ACCOUNT_OWNER) {
      if (context.targetRole && context.targetRole !== Role.MEMBER) {
        this.logger.debug(`Permission denied: ACCOUNT_OWNER can only create MEMBER`);
        return false;
      }
    }

    // Ejemplo: ADMIN no puede crear empleados (ADMIN, EDITOR)
    if (
      (action === Action.CREATE_ADMIN || action === Action.CREATE_EDITOR) &&
      userRole === Role.ADMIN
    ) {
      this.logger.debug(`Permission denied: ADMIN cannot create employees`);
      return false;
    }

    // Más validaciones contextuales pueden agregarse aquí

    return true;
  }

  /**
   * Obtiene todas las acciones que un rol puede realizar
   *
   * @param role - Rol del usuario
   * @returns Array de acciones permitidas
   */
  getAllowedActions(role: Role): Action[] {
    return getRolePermissions(role);
  }

  /**
   * Verifica si un rol puede realizar múltiples acciones (AND)
   *
   * @param role - Rol del usuario
   * @param actions - Array de acciones requeridas
   * @returns true si puede realizar TODAS las acciones
   */
  canAll(role: Role, actions: Action[]): boolean {
    return actions.every((action) => this.can(role, action));
  }

  /**
   * Verifica si un rol puede realizar al menos una acción (OR)
   *
   * @param role - Rol del usuario
   * @param actions - Array de acciones a verificar
   * @returns true si puede realizar AL MENOS UNA acción
   */
  canAny(role: Role, actions: Action[]): boolean {
    return actions.some((action) => this.can(role, action));
  }

  /**
   * Verifica permisos de recursos específicos
   * Útil para endpoints RESTful con recursos
   *
   * @param role - Rol del usuario
   * @param action - Acción que se intenta realizar
   * @param resource - Recurso sobre el que se actúa
   * @param context - Contexto adicional
   * @returns true si tiene permiso
   */
  canAccessResource(
    role: Role,
    action: Action,
    resource: Resource,
    context?: PermissionContext,
  ): boolean {
    // Mapeo de recursos a acciones
    // Esta lógica puede expandirse según necesidades

    this.logger.debug(
      `Checking resource access: ${role} -> ${action} on ${resource}`,
    );

    return this.can(role, action, context);
  }
}
