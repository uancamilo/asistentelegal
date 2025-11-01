import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../modules/user/domain/entities/User.entity';

/**
 * Decorator para extraer el usuario autenticado del request
 * El usuario es agregado por JwtStrategy después de validar el token
 *
 * Ejemplo de uso:
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: UserEntity) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request['user'];
  }
);
