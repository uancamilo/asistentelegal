import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/constants/tokens';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { LogoutResponseDto } from '../dtos/Logout.dto';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(userId: string): Promise<LogoutResponseDto> {
    // 1. Buscar usuario
    const user = await this.userRepository.findById(userId);

    if (!user) {
      // Usuario no encontrado, pero retornamos éxito por seguridad
      // (no revelar si el usuario existe o no)
      return { message: 'Logout successful' };
    }

    // 2. Incrementar tokenVersion para invalidar todos los tokens previos
    user.tokenVersion += 1;
    user.updatedAt = new Date();

    // 3. Guardar el usuario actualizado
    await this.userRepository.update(userId, user);

    // 4. Retornar respuesta exitosa
    return { message: 'Logout successful' };
  }
}
