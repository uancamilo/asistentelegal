import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Guard para proteger rutas de refresh token
 * Usa la estrategia 'jwt-refresh' definida en JwtRefreshStrategy
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  override canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
