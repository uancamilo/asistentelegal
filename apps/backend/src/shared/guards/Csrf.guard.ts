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

    // Verificar que el origen coincida con alguno de los permitidos
    const isAllowed = this.allowedOrigins.some(allowedOrigin => {
      const normalizedAllowed = new URL(allowedOrigin).origin;
      return normalizedOrigin === normalizedAllowed;
    });

    if (!isAllowed) {
      throw new ForbiddenException('Invalid Origin - Possible CSRF attack');
    }

    return true;
  }
}
