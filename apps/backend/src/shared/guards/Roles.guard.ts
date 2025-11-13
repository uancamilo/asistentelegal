import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../modules/user/domain/entities/User.entity';
import { UserEntity } from '../../modules/user/domain/entities/User.entity';
import { ROLES_KEY } from '../decorators/Roles.decorator';

/**
 * Guard para verificar que el usuario autenticado tenga uno de los roles permitidos
 * Se usa junto con el decorator @Roles()
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener los roles requeridos del decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles especificados, denegar acceso (fail-closed)
    if (!requiredRoles || requiredRoles.length === 0) {
      return false;
    }

    // 2. Obtener el usuario autenticado del request (agregado por JwtStrategy)
    const request = context.switchToHttp().getRequest();
    const user: UserEntity = request['user'];

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 3. Verificar si el usuario tiene alguno de los roles requeridos
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
