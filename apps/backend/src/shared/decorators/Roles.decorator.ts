import { SetMetadata } from '@nestjs/common';
import { Role } from '../../modules/user/domain/entities/User.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator para especificar qué roles pueden acceder a una ruta
 * Ejemplo: @Roles(Role.SUPER_ADMIN, Role.ADMIN)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
