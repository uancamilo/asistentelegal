/**
 * Matriz de Permisos RBAC
 *
 * Define qué acciones puede realizar cada rol en el sistema.
 * Principio: SUPER_ADMIN tiene acceso total a TODAS las funciones.
 */

import { Role } from '../../modules/user/domain/entities/User.entity';
import { Action } from './permissions.constants';

/**
 * Matriz de permisos corregida
 * SUPER_ADMIN: Acceso total sin restricciones (✅ en todas las acciones)
 * Otros roles: Permisos específicos según jerarquía
 */
export const PERMISSIONS_MATRIX: Record<Role, Action[]> = {
  /**
   * SUPER_ADMIN - Acceso Total
   * Puede realizar TODAS las acciones del sistema sin excepción
   */
  [Role.SUPER_ADMIN]: [
    // User Management - TODAS las acciones
    Action.CREATE_SUPER_ADMIN,
    Action.CREATE_ADMIN,
    Action.CREATE_EDITOR,
    Action.CREATE_ACCOUNT_OWNER,
    Action.CREATE_MEMBER,
    Action.VIEW_ALL_USERS,
    Action.VIEW_CLIENT_USERS, // ✅ CORREGIDO: SUPER_ADMIN puede ver usuarios clientes
    Action.VIEW_ACCOUNT_USERS, // ✅ CORREGIDO: SUPER_ADMIN puede ver usuarios de cualquier cuenta
    Action.VIEW_OWN_PROFILE,
    Action.EDIT_USER,
    Action.SUSPEND_USER,
    Action.DELETE_USER,

    // Account Management - TODAS las acciones
    Action.CREATE_ACCOUNT,
    Action.DELETE_ACCOUNT,
    Action.VIEW_ALL_ACCOUNTS,
    Action.VIEW_CLIENT_ACCOUNTS, // ✅ CORREGIDO: SUPER_ADMIN puede ver cuentas de clientes
    Action.VIEW_OWN_ACCOUNT, // ✅ CORREGIDO: SUPER_ADMIN puede ver su propia cuenta
    Action.EDIT_EMPLOYEES_ACCOUNT,
    Action.EDIT_CLIENT_ACCOUNTS,
    Action.EDIT_OWN_ACCOUNT, // ✅ CORREGIDO: SUPER_ADMIN puede editar su propia cuenta

    // Content Management - TODAS las acciones
    Action.VIEW_CONTENT,
    Action.CREATE_CONTENT,
    Action.EDIT_CONTENT,
    Action.DELETE_CONTENT,
    Action.PUBLISH_CONTENT,

    // Reports and Analytics - TODAS las acciones
    Action.VIEW_PLATFORM_REPORTS,
    Action.VIEW_CLIENT_REPORTS, // ✅ CORREGIDO: SUPER_ADMIN puede ver reportes de clientes
    Action.VIEW_CONTENT_REPORTS,
    Action.VIEW_ACCOUNT_STATS, // ✅ CORREGIDO: SUPER_ADMIN puede ver estadísticas de cuentas
    Action.GENERATE_CONTENT_REPORTS,
  ],

  /**
   * ADMIN - Gestor de Clientes
   * Enfocado en gestión de cuentas de clientes y sus usuarios
   */
  [Role.ADMIN]: [
    // User Management
    Action.CREATE_ACCOUNT_OWNER, // Solo puede crear ACCOUNT_OWNER
    Action.VIEW_CLIENT_USERS, // Solo ve usuarios de clientes
    Action.VIEW_OWN_PROFILE,
    Action.EDIT_USER, // Puede editar ACCOUNT_OWNER y MEMBER (validado en dominio)

    // Account Management
    Action.CREATE_ACCOUNT, // Puede crear cuentas de clientes
    Action.VIEW_CLIENT_ACCOUNTS, // Solo ve cuentas de clientes (no "Employees")
    Action.EDIT_CLIENT_ACCOUNTS, // Solo edita cuentas de clientes (no "Employees")
    // NOTA: ADMIN NO puede eliminar cuentas (DELETE_ACCOUNT es solo para SUPER_ADMIN)

    // Reports
    Action.VIEW_CLIENT_REPORTS, // Reportes de clientes
  ],

  /**
   * EDITOR - Gestor de Contenido
   * 100% enfocado en contenido, no gestiona usuarios ni cuentas
   */
  [Role.EDITOR]: [
    // User Management
    Action.VIEW_OWN_PROFILE, // Solo su perfil

    // Content Management - Acceso total
    Action.VIEW_CONTENT,
    Action.CREATE_CONTENT,
    Action.EDIT_CONTENT,
    Action.DELETE_CONTENT,
    Action.PUBLISH_CONTENT,

    // Reports
    Action.VIEW_CONTENT_REPORTS, // Reportes de contenido
    Action.GENERATE_CONTENT_REPORTS, // Puede generar reportes
  ],

  /**
   * ACCOUNT_OWNER - Dueño de Cuenta de Cliente
   * Gestiona su propia cuenta y puede invitar MEMBERs
   */
  [Role.ACCOUNT_OWNER]: [
    // User Management
    Action.CREATE_MEMBER, // Solo puede crear MEMBER en su cuenta
    Action.VIEW_ACCOUNT_USERS, // Ve usuarios de su cuenta
    Action.VIEW_OWN_PROFILE,

    // Account Management
    Action.VIEW_OWN_ACCOUNT, // Solo su cuenta
    Action.EDIT_OWN_ACCOUNT, // Puede editar su propia cuenta

    // Content
    Action.VIEW_CONTENT, // Puede ver contenido

    // Reports
    Action.VIEW_ACCOUNT_STATS, // Estadísticas de su cuenta
  ],

  /**
   * MEMBER - Usuario Final
   * Acceso de solo lectura básico
   */
  [Role.MEMBER]: [
    // User Management
    Action.VIEW_OWN_PROFILE, // Solo su perfil

    // Account Management
    Action.VIEW_OWN_ACCOUNT, // Solo su cuenta (lectura)

    // Content
    Action.VIEW_CONTENT, // Puede ver contenido
  ],
};

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(role: Role, action: Action): boolean {
  return PERMISSIONS_MATRIX[role]?.includes(action) ?? false;
}

/**
 * Obtiene todos los permisos de un rol
 */
export function getRolePermissions(role: Role): Action[] {
  return PERMISSIONS_MATRIX[role] ?? [];
}

/**
 * Verifica si SUPER_ADMIN tiene todos los permisos
 * Esta función es para validación de integridad
 */
export function validateSuperAdminPermissions(): boolean {
  const allActions = Object.values(Action);
  const superAdminPermissions = PERMISSIONS_MATRIX[Role.SUPER_ADMIN];

  // SUPER_ADMIN debe tener TODOS los permisos
  return allActions.every((action) => superAdminPermissions.includes(action));
}
