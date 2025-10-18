import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/interfaces/IUserRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserEntity, Role } from '../../domain/entities/User.entity';
import { GetUserResponseDto, ListUsersResponseDto } from '../dtos/GetUser.dto';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(currentUser: UserEntity): Promise<ListUsersResponseDto> {
    let users: UserEntity[] = [];

    // 1. SUPER_ADMIN puede listar todos los usuarios
    if (currentUser.role === Role.SUPER_ADMIN) {
      users = await this.userRepository.findAll();
    }
    // 2. ADMIN puede listar solo usuarios de clientes (ACCOUNT_OWNER, MEMBER)
    else if (currentUser.role === Role.ADMIN) {
      const allUsers = await this.userRepository.findAll();
      users = allUsers.filter((user) => user.isClient());
    }
    // 3. ACCOUNT_OWNER puede listar usuarios de su cuenta
    else if (currentUser.role === Role.ACCOUNT_OWNER) {
      if (!currentUser.accountId) {
        throw new ForbiddenException('Account owner must have an accountId');
      }
      users = await this.userRepository.findByAccountId(currentUser.accountId);
      // Incluir al mismo ACCOUNT_OWNER en la lista
      const owner = await this.userRepository.findById(currentUser.id);
      if (owner) {
        users.push(owner);
      }
    }
    // 4. EDITOR y MEMBER no pueden listar usuarios
    else {
      throw new ForbiddenException('You are not allowed to list users');
    }

    // 5. Convertir a DTOs
    const userDtos = users.map((user) => this.toDto(user));

    return {
      users: userDtos,
      total: userDtos.length,
    };
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
