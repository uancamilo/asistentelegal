import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard opcional para autenticación JWT
 *
 * A diferencia de JwtAuthGuard, este guard:
 * - Intenta extraer el usuario del token JWT
 * - Si el token es válido, añade el usuario a la request
 * - Si no hay token o es inválido, permite la petición sin usuario
 *
 * Útil para endpoints que tienen comportamiento diferente
 * para usuarios autenticados vs no autenticados
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    // Intentar activar la autenticación JWT
    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any) {
    // No lanzar error si no hay usuario o hay error de autenticación
    // Simplemente devolver null o el usuario si existe
    if (err || !user) {
      return null;
    }
    return user;
  }
}
