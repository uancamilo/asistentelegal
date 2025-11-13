import { Logger } from '@nestjs/common';

/**
 * Utilidad para logging seguro sin exponer PII (Personally Identifiable Information)
 *
 * GDPR/CCPA Compliance:
 * - NUNCA loguea emails, nombres, teléfonos en producción
 * - Sanitiza stack traces para remover rutas sensibles
 * - Usa IDs en lugar de datos personales
 * - Remueve información sensible de objetos
 */

const isProduction = process.env['NODE_ENV'] === 'production';
const isDevelopment = process.env['NODE_ENV'] === 'development';

/**
 * Sanitiza un email para logging
 * - Desarrollo: Muestra email completo
 * - Producción: Muestra solo hash o ID
 */
export function sanitizeEmail(email: string, userId?: string): string {
  if (isDevelopment) {
    return email;
  }

  // En producción, usar userId si está disponible, sino hashear el email
  if (userId) {
    return `user:${userId}`;
  }

  // Mostrar solo dominio para debugging
  const domain = email.split('@')[1] || 'unknown';
  return `***@${domain}`;
}

/**
 * Sanitiza un stack trace removiendo rutas absolutas y información sensible
 */
export function sanitizeStackTrace(stack?: string): string | undefined {
  if (!stack) return undefined;

  if (isDevelopment) {
    return stack;
  }

  // En producción, remover rutas absolutas y mostrar solo nombres de archivo relativos
  return stack
    .split('\n')
    .map(line => {
      // Remover rutas absolutas: /home/user/project/src/file.ts -> src/file.ts
      return line.replace(/\/[^\s]+\/(src\/[^\s:]+)/g, '$1');
    })
    .slice(0, 3) // Solo primeras 3 líneas para reducir verbosidad
    .join('\n');
}

/**
 * Sanitiza un objeto removiendo campos sensibles antes de loguear
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (isDevelopment) {
    return obj;
  }

  const sensitiveFields = ['email', 'password', 'passwordHash', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logger seguro para emails y datos de usuario
 * Usa sanitización automática de PII
 */
export class SecureLogger {
  private readonly logger: Logger;

  constructor(context?: string) {
    this.logger = new Logger(context || 'Application');
  }

  /**
   * Log de información general (sin PII)
   */
  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  /**
   * Log de error con sanitización automática de stack traces
   */
  error(message: string, error?: Error, context?: string): void {
    if (isDevelopment) {
      this.logger.error(message, error?.stack, context);
    } else {
      const sanitizedStack = sanitizeStackTrace(error?.stack);
      this.logger.error(message, sanitizedStack, context);
    }
  }

  /**
   * Log de warning
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  /**
   * Log de debugging (solo en desarrollo)
   */
  debug(message: string, context?: string): void {
    if (isDevelopment) {
      this.logger.debug(message, context);
    }
  }

  /**
   * Log de auditoría con sanitización de email
   */
  audit(userId: string, email: string, action: string, resource: string, resourceId: string): void {
    const sanitizedEmail = sanitizeEmail(email, userId);
    this.logger.log(`[AUDIT] ${sanitizedEmail} performed ${action} on ${resource}:${resourceId}`);
  }

  /**
   * Log de acceso denegado con sanitización
   */
  accessDenied(userId: string, email: string, resource: string, resourceId: string, reason: string): void {
    const sanitizedEmail = sanitizeEmail(email, userId);
    this.logger.warn(`[AUDIT] ACCESS DENIED: ${sanitizedEmail} tried to access ${resource}:${resourceId} - Reason: ${reason}`);
  }

  /**
   * Log de fallo de autenticación con sanitización
   */
  authFailure(email: string, action: string, reason: string, ipAddress?: string): void {
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedIp = isProduction && ipAddress ? `${ipAddress.split('.').slice(0, 3).join('.')}.***` : ipAddress;
    this.logger.warn(`[AUDIT] AUTH FAILURE: ${sanitizedEmail} - ${action} - ${reason} - IP: ${sanitizedIp || 'unknown'}`);
  }

  /**
   * Log de email enviado (stub) - solo en desarrollo
   */
  emailStub(to: string, content: string): void {
    if (isDevelopment) {
      console.log('\n📧 EMAIL ENVIADO (STUB):');
      console.log(`Para: ${to}`);
      console.log(content);
      console.log('═══════════════════════════════════════════════════════════\n');
    } else {
      // En producción, solo loguear que se envió sin mostrar contenido ni email
      this.logger.log(`[EMAIL] Email sent successfully (recipient: ${sanitizeEmail(to)})`);
    }
  }
}
