import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/constants/tokens';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserEntity, Role } from '../../domain/entities/User.entity';
import { GetUserResponseDto } from '../dtos/GetUser.dto';

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

    // 2. Verificar permisos de acceso
    // SUPER_ADMIN puede ver todos los usuarios
    if (currentUser.role === Role.SUPER_ADMIN) {
      return this.toDto(user);
    }

    // ADMIN puede ver todos los usuarios de clientes (ACCOUNT_OWNER, MEMBER)
    if (currentUser.role === Role.ADMIN) {
      if (user.isClient()) {
        return this.toDto(user);
      }
      throw new ForbiddenException('You cannot view employee users');
    }

    // ACCOUNT_OWNER puede ver usuarios de su cuenta
    if (currentUser.role === Role.ACCOUNT_OWNER) {
      if (user.accountId === currentUser.accountId || user.id === currentUser.id) {
        return this.toDto(user);
      }
      throw new ForbiddenException('You can only view users from your account');
    }

    // MEMBER y EDITOR solo pueden ver su propio perfil
    if (user.id === currentUser.id) {
      return this.toDto(user);
    }

    throw new ForbiddenException('You cannot view this user');
  }

  private toDto(user: UserEntity): GetUserResponseDto {
    return {
      id: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      accountId: user.accountId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
