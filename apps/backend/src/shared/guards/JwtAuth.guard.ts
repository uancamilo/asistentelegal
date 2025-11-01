import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Guard para proteger rutas con autenticación JWT (access token)
 * Usa la estrategia 'jwt' definida en JwtStrategy
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
