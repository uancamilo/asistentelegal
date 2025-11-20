import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard CSRF que verifica el origen de las peticiones
 * Protege contra Cross-Site Request Forgery comparando el header Origin
 * con el origen permitido (CORS_ORIGIN)
 *
 * Se usa junto con SameSite=strict cookies para doble protección
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(private readonly configService: ConfigService) {
    this.allowedOrigins = this.configService.getOrThrow<string[]>('app.corsOrigin');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Solo verificar en métodos que modifican estado (POST, PUT, PATCH, DELETE)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Obtener el header Origin o Referer
    const origin = request.headers['origin'] || request.headers['referer'];

    if (!origin) {
      throw new ForbiddenException('Missing Origin or Referer header');
    }

    // Normalizar: remover trailing slash y convertir a URL
    const normalizedOrigin = new URL(origin).origin;

    // Verificar que el origen coincida con alguno de los permitidos (exact match o wildcard pattern)
    const isAllowed = this.allowedOrigins.some(allowedOrigin => {
      // Exact match
      try {
        const normalizedAllowed = new URL(allowedOrigin).origin;
        if (normalizedOrigin === normalizedAllowed) {
          return true;
        }
      } catch (e) {
        // Si allowedOrigin tiene wildcard, new URL() puede fallar
        // Continuar con pattern matching
      }

      // Wildcard pattern matching (e.g., http://192.168.0.*:3000)
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
          .replace(/\*/g, '.*'); // Replace * with .*
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(normalizedOrigin);
      }

      return false;
    });

    if (!isAllowed) {
      throw new ForbiddenException('Invalid Origin - Possible CSRF attack');
    }

    return true;
  }
}
