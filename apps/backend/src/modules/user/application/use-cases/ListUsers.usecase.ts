import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/constants/tokens';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserEntity, Role } from '../../domain/entities/User.entity';
import { ListUsersResponseDto } from '../dtos/GetUser.dto';
import { UserMapper } from '../../../../shared/mappers/user.mapper';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(currentUser: UserEntity, limit: number = 50, offset: number = 0): Promise<ListUsersResponseDto> {
    let users: UserEntity[] = [];
    let total: number = 0;

    // 1. SUPER_ADMIN puede listar todos los usuarios con paginación
    if (currentUser.role === Role.SUPER_ADMIN) {
      users = await this.userRepository.findAll(limit, offset);
      // Note: For exact total count, use a separate count query
      // For now, return actual users count (optimization: total count can be added if needed)
      total = users.length;
    }
    // 2. ADMIN puede listar todos los usuarios excepto SUPER_ADMIN
    else if (currentUser.role === Role.ADMIN) {
      const allUsers = await this.userRepository.findAll(limit, offset);
      users = allUsers.filter(user => user.role !== Role.SUPER_ADMIN);
      total = users.length;
    }
    // 3. ACCOUNT_OWNER puede listar usuarios de su cuenta
    else if (currentUser.role === Role.ACCOUNT_OWNER) {
      if (!currentUser.accountId) {
        throw new ForbiddenException('Account owner must have an accountId');
      }
      users = await this.userRepository.findByAccountId(currentUser.accountId);
      // Incluir al mismo ACCOUNT_OWNER en la lista
      // PERFORMANCE FIX (P2.13): Use currentUser directly instead of redundant database query
      users.push(currentUser);
      total = users.length;
    }
    // 4. EDITOR y MEMBER no pueden listar usuarios
    else {
      throw new ForbiddenException('You are not allowed to list users');
    }

    // 5. Convertir a DTOs usando el mapper centralizado
    const userDtos = users.map((user) => UserMapper.toDto(user));

    return {
      users: userDtos,
      total,
    };
  }
}
