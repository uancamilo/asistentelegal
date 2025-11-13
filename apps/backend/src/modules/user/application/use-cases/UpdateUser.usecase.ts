import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../domain/constants/tokens';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { UserEntity, Role } from '../../domain/entities/User.entity';
import { UpdateUserRequestDto } from '../dtos/UpdateUser.dto';
import { UserMapper } from '../../../../shared/mappers/user.mapper';
import { Email } from '../../domain/value-objects/Email.vo';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(userId: string, dto: UpdateUserRequestDto, currentUser: UserEntity) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verificar permisos
    if (currentUser.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN puede actualizar a cualquiera excepto otros SUPER_ADMIN
      if (user.role === Role.SUPER_ADMIN && user.id !== currentUser.id) {
        throw new ForbiddenException('Cannot update other SUPER_ADMIN users');
      }
    } else if (currentUser.role === Role.ADMIN) {
      // ADMIN puede actualizar usuarios excepto SUPER_ADMIN
      if (user.role === Role.SUPER_ADMIN) {
        throw new ForbiddenException('Cannot update SUPER_ADMIN users');
      }
    } else {
      // Otros roles no pueden actualizar usuarios
      throw new ForbiddenException('You do not have permission to update users');
    }

    // Construir objeto de actualización con solo los campos modificables
    const updateData: any = {};

    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.email) updateData.email = Email.create(dto.email);
    if (dto.role) updateData.role = dto.role;
    if (dto.status) updateData.status = dto.status;
    // accountId no se puede modificar desde este endpoint

    // Guardar cambios
    const updated = await this.userRepository.update(userId, updateData as Partial<UserEntity>);

    return UserMapper.toDto(updated);
  }
}
