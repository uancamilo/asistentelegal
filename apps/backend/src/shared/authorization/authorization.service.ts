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
    context: PermissionContext
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
    context?: PermissionContext
  ): boolean {
    // Mapeo de recursos a acciones
    // Esta lógica puede expandirse según necesidades

    this.logger.debug(`Checking resource access: ${role} -> ${action} on ${resource}`);

    return this.can(role, action, context);
  }

  // ========================================================================
  // MÉTODOS ESPECÍFICOS DE ACCOUNT - Consolidación de lógica de autorización
  // ========================================================================

  /**
   * Verifica si un usuario puede crear una cuenta
   *
   * Reglas:
   * - SUPER_ADMIN: ✅ Puede crear cualquier cuenta
   * - ADMIN: ✅ Puede crear cuentas de clientes
   * - Otros roles: ❌ No pueden crear cuentas
   *
   * @param userRole - Rol del usuario que intenta crear
   * @returns true si puede crear cuenta
   */
  canCreateAccount(userRole: Role): boolean {
    const canCreate = this.can(userRole, Action.CREATE_ACCOUNT);

    this.logger.debug(
      `canCreateAccount: ${userRole} -> ${canCreate ? 'GRANTED' : 'DENIED'}`
    );

    return canCreate;
  }

  /**
   * Verifica si un usuario puede listar cuentas
   *
   * Reglas:
   * - SUPER_ADMIN: ✅ Puede ver TODAS las cuentas (incluida Employees)
   * - ADMIN: ✅ Puede ver solo cuentas de clientes (NO Employees)
   * - Otros roles: ❌ No pueden listar cuentas
   *
   * @param userRole - Rol del usuario que intenta listar
   * @returns true si puede listar cuentas
   */
  canListAccounts(userRole: Role): boolean {
    const canList =
      this.can(userRole, Action.VIEW_ALL_ACCOUNTS) ||
      this.can(userRole, Action.VIEW_CLIENT_ACCOUNTS);

    this.logger.debug(
      `canListAccounts: ${userRole} -> ${canList ? 'GRANTED' : 'DENIED'}`
    );

    return canList;
  }

  /**
   * Verifica si un usuario puede acceder (ver) una cuenta específica
   *
   * Reglas:
   * - SUPER_ADMIN: ✅ Puede ver CUALQUIER cuenta (incluida Employees)
   * - ADMIN: ✅ Puede ver cuentas de clientes | ❌ NO puede ver Employees
   * - ACCOUNT_OWNER: ✅ Puede ver SOLO su propia cuenta
   * - Otros roles: ❌ No pueden ver cuentas
   *
   * @param userRole - Rol del usuario
   * @param userAccountId - ID de la cuenta del usuario
   * @param targetAccountId - ID de la cuenta objetivo
   * @param targetIsSystemAccount - Si la cuenta objetivo es del sistema
   * @returns true si puede acceder a la cuenta
   */
  canAccessAccount(
    userRole: Role,
    userAccountId: string | null,
    targetAccountId: string,
    targetIsSystemAccount: boolean
  ): boolean {
    // SUPER_ADMIN: acceso total a todas las cuentas
    if (userRole === Role.SUPER_ADMIN) {
      this.logger.debug(
        `canAccessAccount: SUPER_ADMIN -> GRANTED (total access)`
      );
      return true;
    }

    // ADMIN: solo cuentas de clientes (NO system accounts)
    if (userRole === Role.ADMIN) {
      if (targetIsSystemAccount) {
        this.logger.debug(
          `canAccessAccount: ADMIN -> DENIED (cannot access system account)`
        );
        return false;
      }

      const canView = this.can(userRole, Action.VIEW_CLIENT_ACCOUNTS);
      this.logger.debug(
        `canAccessAccount: ADMIN -> ${canView ? 'GRANTED' : 'DENIED'} (client account)`
      );
      return canView;
    }

    // ACCOUNT_OWNER: solo su propia cuenta
    if (userRole === Role.ACCOUNT_OWNER) {
      const isOwnAccount = userAccountId === targetAccountId;

      if (!isOwnAccount) {
        this.logger.debug(
          `canAccessAccount: ACCOUNT_OWNER -> DENIED (not own account)`
        );
        return false;
      }

      const canView = this.can(userRole, Action.VIEW_OWN_ACCOUNT);
      this.logger.debug(
        `canAccessAccount: ACCOUNT_OWNER -> ${canView ? 'GRANTED' : 'DENIED'} (own account)`
      );
      return canView;
    }

    // Otros roles: no tienen acceso
    this.logger.debug(
      `canAccessAccount: ${userRole} -> DENIED (no account access)`
    );
    return false;
  }

  /**
   * Verifica si un usuario puede editar una cuenta específica
   *
   * Reglas:
   * - SUPER_ADMIN: ✅ Puede editar CUALQUIER cuenta (incluida Employees)
   * - ADMIN: ✅ Puede editar cuentas de clientes | ❌ NO puede editar Employees
   * - ACCOUNT_OWNER: ✅ Puede editar SOLO su propia cuenta
   * - Otros roles: ❌ No pueden editar cuentas
   *
   * @param userRole - Rol del usuario
   * @param userAccountId - ID de la cuenta del usuario
   * @param targetAccountId - ID de la cuenta objetivo
   * @param targetIsSystemAccount - Si la cuenta objetivo es del sistema
   * @returns true si puede editar la cuenta
   */
  canEditAccount(
    userRole: Role,
    userAccountId: string | null,
    targetAccountId: string,
    targetIsSystemAccount: boolean
  ): boolean {
    // SUPER_ADMIN: puede editar cualquier cuenta
    if (userRole === Role.SUPER_ADMIN) {
      this.logger.debug(
        `canEditAccount: SUPER_ADMIN -> GRANTED (can edit any account)`
      );
      return true;
    }

    // ADMIN: solo cuentas de clientes (NO system accounts)
    if (userRole === Role.ADMIN) {
      if (targetIsSystemAccount) {
        this.logger.debug(
          `canEditAccount: ADMIN -> DENIED (cannot edit system account)`
        );
        return false;
      }

      const canEdit = this.can(userRole, Action.EDIT_CLIENT_ACCOUNTS);
      this.logger.debug(
        `canEditAccount: ADMIN -> ${canEdit ? 'GRANTED' : 'DENIED'} (client account)`
      );
      return canEdit;
    }

    // ACCOUNT_OWNER: solo su propia cuenta
    if (userRole === Role.ACCOUNT_OWNER) {
      const isOwnAccount = userAccountId === targetAccountId;

      if (!isOwnAccount) {
        this.logger.debug(
          `canEditAccount: ACCOUNT_OWNER -> DENIED (not own account)`
        );
        return false;
      }

      const canEdit = this.can(userRole, Action.EDIT_OWN_ACCOUNT);
      this.logger.debug(
        `canEditAccount: ACCOUNT_OWNER -> ${canEdit ? 'GRANTED' : 'DENIED'} (own account)`
      );
      return canEdit;
    }

    // Otros roles: no pueden editar
    this.logger.debug(
      `canEditAccount: ${userRole} -> DENIED (no edit permission)`
    );
    return false;
  }

  /**
   * Verifica si un usuario puede eliminar una cuenta específica
   *
   * Reglas:
   * - SUPER_ADMIN: ✅ Puede eliminar cuentas de clientes | ❌ NO puede eliminar system accounts
   * - Otros roles: ❌ No pueden eliminar cuentas
   *
   * IMPORTANTE: Incluso SUPER_ADMIN NO puede eliminar cuentas del sistema.
   * La validación adicional de si la cuenta es del sistema se hace en el use case.
   *
   * @param userRole - Rol del usuario
   * @param targetIsSystemAccount - Si la cuenta objetivo es del sistema
   * @returns true si puede eliminar la cuenta
   */
  canDeleteAccount(userRole: Role, targetIsSystemAccount: boolean): boolean {
    // Solo SUPER_ADMIN puede eliminar cuentas
    if (userRole !== Role.SUPER_ADMIN) {
      this.logger.debug(
        `canDeleteAccount: ${userRole} -> DENIED (only SUPER_ADMIN can delete)`
      );
      return false;
    }

    // SUPER_ADMIN NO puede eliminar cuentas del sistema
    if (targetIsSystemAccount) {
      this.logger.debug(
        `canDeleteAccount: SUPER_ADMIN -> DENIED (cannot delete system account)`
      );
      return false;
    }

    const canDelete = this.can(userRole, Action.DELETE_ACCOUNT);
    this.logger.debug(
      `canDeleteAccount: SUPER_ADMIN -> ${canDelete ? 'GRANTED' : 'DENIED'}`
    );
    return canDelete;
  }
}
