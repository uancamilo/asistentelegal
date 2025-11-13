/**
 * Traducciones centralizadas de enums a español amigable
 *
 * Este archivo centraliza todas las traducciones de enums
 * para mantener consistencia en toda la aplicación
 */

/**
 * Traduce roles de usuario a español
 * Acepta tanto el enum Role como string para mayor flexibilidad
 */
export const translateRole = (role: string | { toString(): string }): string => {
  const roleStr = typeof role === 'string' ? role : role.toString()
  const translations: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    ACCOUNT_OWNER: 'Propietario de Cuenta',
    EDITOR: 'Editor',
    MEMBER: 'Miembro',
  }
  return translations[roleStr] || roleStr
}

/**
 * Traduce estados de usuario a español
 * Acepta tanto el enum UserStatus como string para mayor flexibilidad
 */
export const translateUserStatus = (status: string | { toString(): string }): string => {
  const statusStr = typeof status === 'string' ? status : status.toString()
  const translations: Record<string, string> = {
    ACTIVE: 'Activo',
    INVITED: 'Invitado',
    SUSPENDED: 'Suspendido',
  }
  return translations[statusStr] || statusStr
}

/**
 * Traduce estados de cuenta a español
 * Acepta tanto el enum AccountStatus como string para mayor flexibilidad
 */
export const translateAccountStatus = (status: string | { toString(): string }): string => {
  const statusStr = typeof status === 'string' ? status : status.toString()
  const translations: Record<string, string> = {
    PENDING: 'Pendiente',
    ACTIVE: 'Activa',
    INACTIVE: 'Inactiva',
    SUSPENDED: 'Suspendida',
  }
  return translations[statusStr] || statusStr
}

/**
 * Traduce tipos de documento a español
 */
export const translateDocumentType = (type: string): string => {
  const translations: Record<string, string> = {
    CONSTITUCION: 'Constitución',
    TRATADO_INTERNACIONAL: 'Tratado Internacional',
    LEY_ORGANICA: 'Ley Orgánica',
    LEY_ORDINARIA: 'Ley Ordinaria',
    DECRETO_LEY: 'Decreto Ley',
    DECRETO: 'Decreto',
    REGLAMENTO: 'Reglamento',
    ORDENANZA: 'Ordenanza',
    RESOLUCION: 'Resolución',
    ACUERDO: 'Acuerdo',
    CIRCULAR: 'Circular',
    DIRECTIVA: 'Directiva',
    OTRO: 'Otro',
  }
  return translations[type] || type
}

/**
 * Traduce estados de documento a español
 */
export const translateDocumentStatus = (status: string): string => {
  const translations: Record<string, string> = {
    DRAFT: 'Borrador',
    PUBLISHED: 'Publicado',
    ARCHIVED: 'Archivado',
  }
  return translations[status] || status
}

/**
 * Traduce ámbitos de documento a español
 */
export const translateDocumentScope = (scope: string): string => {
  const translations: Record<string, string> = {
    INTERNACIONAL: 'Internacional',
    NACIONAL: 'Nacional',
    REGIONAL: 'Regional',
    MUNICIPAL: 'Municipal',
    LOCAL: 'Local',
  }
  return translations[scope] || scope
}

/**
 * Obtiene versión corta del rol (para espacios reducidos)
 */
export const getRoleShort = (role: string): string => {
  const shorts: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    ACCOUNT_OWNER: 'Propietario',
    EDITOR: 'Editor',
    MEMBER: 'Miembro',
  }
  return shorts[role] || role
}
