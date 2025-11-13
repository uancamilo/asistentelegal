import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom Throttler Guard que usa userId para rate limiting
 *
 * Comportamiento:
 * - Si hay usuario autenticado: usa userId como clave (más preciso)
 * - Si NO hay usuario: usa IP (fallback para endpoints públicos)
 *
 * Ventajas:
 * - Más justo: diferentes usuarios detrás de la misma IP tienen límites independientes
 * - Más seguro: previene abuso por parte de usuarios autenticados
 * - Compatible: funciona tanto con endpoints autenticados como públicos
 *
 * Uso:
 * ```
 * @UseGuards(UserThrottlerGuard)
 * @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min
 * async myEndpoint() { ... }
 * ```
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * Genera la clave de throttling
   *
   * Prioridad:
   * 1. userId (si está autenticado)
   * 2. IP (fallback)
   */
  protected override generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const request = context.switchToHttp().getRequest();

    // Si hay usuario autenticado, usar su ID
    if (request.user?.id) {
      return `user:${request.user.id}:${suffix}`;
    }

    // Fallback: usar IP (comportamiento estándar)
    return super.generateKey(context, suffix, name);
  }

  /**
   * Mensaje de error personalizado
   */
  protected override async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest();

    if (request.user?.id) {
      throw new ThrottlerException(
        'Too many requests from this user. Please try again later.'
      );
    }

    throw new ThrottlerException(
      'Too many requests from this IP address. Please try again later.'
    );
  }
}
