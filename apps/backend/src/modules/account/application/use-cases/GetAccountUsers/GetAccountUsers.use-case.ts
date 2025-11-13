import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ACCOUNT_REPOSITORY } from '../../../domain/constants/tokens';
import { IAccountRepository } from '../../../domain/interfaces/IAccountRepository';
import { USER_REPOSITORY } from '../../../../user/domain/constants/tokens';
import { IUserRepository } from '../../../../user/domain/interfaces/IUserRepository';
import { UserEntity, Role } from '../../../../user/domain/entities/User.entity';
import { GetAccountUsersResponseDto } from './GetAccountUsers.dto';
import { UserMapper } from '../../../../../shared/mappers/user.mapper';

/**
 * Use Case: Obtener usuarios de una cuenta
 *
 * Reglas de negocio:
 * 1. Solo SUPER_ADMIN puede obtener usuarios de la cuenta EMPLEADOS
 * 2. ADMIN puede obtener usuarios de cuentas de clientes
 * 3. ACCOUNT_OWNER puede obtener usuarios de su propia cuenta
 *
 * Validaciones de seguridad:
 * - Verifica que la cuenta existe
 * - Valida permisos según rol del usuario
 * - Protege acceso a cuenta del sistema (EMPLEADOS)
 */
@Injectable()
export class GetAccountUsersUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(
    accountId: string,
    currentUser: UserEntity
  ): Promise<GetAccountUsersResponseDto> {
    // 1. Buscar la cuenta por ID
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException(`Account with id "${accountId}" not found`);
    }

    // 2. Verificar permisos
    // SUPER_ADMIN puede ver cualquier cuenta (incluida EMPLEADOS)
    if (currentUser.role === Role.SUPER_ADMIN) {
      // Permitido
    }
    // ADMIN solo puede ver cuentas de clientes (no del sistema)
    else if (currentUser.role === Role.ADMIN) {
      if (account.isSystemAccount) {
        throw new ForbiddenException(
          'Admins cannot access system account users'
        );
      }
    }
    // ACCOUNT_OWNER solo puede ver su propia cuenta
    else if (currentUser.role === Role.ACCOUNT_OWNER) {
      if (!currentUser.accountId || currentUser.accountId !== accountId) {
        throw new ForbiddenException(
          'Account owners can only view their own account users'
        );
      }
    }
    // Otros roles no tienen acceso
    else {
      throw new ForbiddenException(
        'You do not have permission to view account users'
      );
    }

    // 3. Obtener usuarios de la cuenta
    const users = await this.userRepository.findByAccountId(accountId);

    // 4. Convertir a DTOs usando el mapper centralizado
    const userDtos = users.map((user) => UserMapper.toDto(user));

    return {
      users: userDtos,
      total: userDtos.length,
    };
  }
}
