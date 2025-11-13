/**
 * Definición centralizada de permisos del sistema
 *
 * Este archivo define todas las acciones y recursos disponibles
 * para la gestión de permisos basada en roles (RBAC)
 */

export enum Action {
  // User Management Actions
  CREATE_SUPER_ADMIN = 'create:super_admin',
  CREATE_ADMIN = 'create:admin',
  CREATE_EDITOR = 'create:editor',
  CREATE_ACCOUNT_OWNER = 'create:account_owner',
  CREATE_MEMBER = 'create:member',

  VIEW_ALL_USERS = 'view:all_users',
  VIEW_CLIENT_USERS = 'view:client_users',
  VIEW_ACCOUNT_USERS = 'view:account_users',
  VIEW_OWN_PROFILE = 'view:own_profile',

  EDIT_USER = 'edit:user',
  SUSPEND_USER = 'suspend:user',
  DELETE_USER = 'delete:user',

  // Account Management Actions
  CREATE_ACCOUNT = 'create:account',
  DELETE_ACCOUNT = 'delete:account',

  VIEW_ALL_ACCOUNTS = 'view:all_accounts',
  VIEW_CLIENT_ACCOUNTS = 'view:client_accounts',
  VIEW_OWN_ACCOUNT = 'view:own_account',

  EDIT_EMPLOYEES_ACCOUNT = 'edit:employees_account',
  EDIT_CLIENT_ACCOUNTS = 'edit:client_accounts',
  EDIT_OWN_ACCOUNT = 'edit:own_account',

  // Content Management Actions
  VIEW_CONTENT = 'view:content',
  CREATE_CONTENT = 'create:content',
  EDIT_CONTENT = 'edit:content',
  DELETE_CONTENT = 'delete:content',
  PUBLISH_CONTENT = 'publish:content',

  // Reports and Analytics Actions
  VIEW_PLATFORM_REPORTS = 'view:platform_reports',
  VIEW_CLIENT_REPORTS = 'view:client_reports',
  VIEW_CONTENT_REPORTS = 'view:content_reports',
  VIEW_ACCOUNT_STATS = 'view:account_stats',
  GENERATE_CONTENT_REPORTS = 'generate:content_reports',
}

export enum Resource {
  USERS = 'users',
  ACCOUNTS = 'accounts',
  CONTENT = 'content',
  REPORTS = 'reports',
}
