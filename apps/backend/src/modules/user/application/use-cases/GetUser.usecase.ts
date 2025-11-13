import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/constants/tokens';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserEntity, Role } from '../../domain/entities/User.entity';
import { GetUserResponseDto } from '../dtos/GetUser.dto';
import { UserMapper } from '../../../../shared/mappers/user.mapper';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(userId: string, currentUser: UserEntity): Promise<GetUserResponseDto> {
    // 1. Buscar el usuario
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Verificar permisos de acceso usando el mapper centralizado
    // SUPER_ADMIN puede ver todos los usuarios
    if (currentUser.role === Role.SUPER_ADMIN) {
      return UserMapper.toDto(user);
    }

    // ADMIN puede ver todos los usuarios excepto SUPER_ADMIN
    if (currentUser.role === Role.ADMIN) {
      if (user.role !== Role.SUPER_ADMIN) {
        return UserMapper.toDto(user);
      }
      throw new ForbiddenException('You cannot view SUPER_ADMIN users');
    }

    // ACCOUNT_OWNER puede ver usuarios de su cuenta
    if (currentUser.role === Role.ACCOUNT_OWNER) {
      if (user.accountId === currentUser.accountId || user.id === currentUser.id) {
        return UserMapper.toDto(user);
      }
      throw new ForbiddenException('You can only view users from your account');
    }

    // MEMBER y EDITOR solo pueden ver su propio perfil
    if (user.id === currentUser.id) {
      return UserMapper.toDto(user);
    }

    throw new ForbiddenException('You cannot view this user');
  }
}
