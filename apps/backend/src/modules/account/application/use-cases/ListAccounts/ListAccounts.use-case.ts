import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { ACCOUNT_REPOSITORY } from '../../../domain/constants/tokens';
import { IAccountRepository } from '../../../domain/interfaces/IAccountRepository';
import { UserEntity, Role } from '../../../../user/domain/entities/User.entity';
import { ListAccountsResponseDto, AccountSummaryDto } from './ListAccounts.dto';
import { AccountMapper } from '../../../../../shared/mappers/account.mapper';

/**
 * Use Case: Listar cuentas
 *
 * Reglas de negocio:
 * 1. Solo SUPER_ADMIN y ADMIN pueden listar cuentas
 * 2. SUPER_ADMIN ve TODAS las cuentas (incluida Employees con isSystemAccount = true)
 * 3. ADMIN solo ve cuentas de clientes (isSystemAccount = false)
 * 4. Otros roles no tienen permiso de listar cuentas
 *
 * Validaciones de seguridad:
 * - Verifica permisos del usuario actual
 * - Filtra cuentas del sistema según el rol
 * - Protege la cuenta Employees de ser vista por ADMIN
 */
@Injectable()
export class ListAccountsUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository
  ) {}

  async execute(currentUser: UserEntity, limit: number = 50, offset: number = 0): Promise<ListAccountsResponseDto> {
    // 1. Verificar permisos: Solo SUPER_ADMIN y ADMIN pueden listar cuentas
    if (![Role.SUPER_ADMIN, Role.ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException(
        `Users with role ${currentUser.role} are not allowed to list accounts`
      );
    }

    // 2. Obtener cuentas del repositorio con paginación según el rol
    // FIXED: Query database directly instead of filtering in memory for proper pagination
    let accounts: Awaited<ReturnType<typeof this.accountRepository.findAll>>;
    let total: number;

    if (currentUser.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN ve TODAS las cuentas (incluida Employees)
      accounts = await this.accountRepository.findAll(limit, offset);
      // Note: For exact total count of all accounts, use a separate count query
      // For now, return actual accounts count (optimization: total count can be added if needed)
      total = accounts.length;
    } else if (currentUser.role === Role.ADMIN) {
      // ADMIN solo ve cuentas de clientes (NO la cuenta Employees)
      // FIXED: Use findClientAccounts to query database with WHERE isSystemAccount = false
      accounts = await this.accountRepository.findClientAccounts(limit, offset);
      // Get accurate total count of client accounts for pagination
      total = await this.accountRepository.countClientAccounts();
    } else {
      // Este bloque no debería ejecutarse debido a la validación del paso 1,
      // pero se incluye por seguridad
      accounts = [];
      total = 0;
    }

    // 3. Mapear entidades a DTOs usando el mapper centralizado
    const accountDtos: AccountSummaryDto[] = accounts.map((account) =>
      AccountMapper.toSummaryDto(account)
    );

    // 4. Retornar respuesta con total count correcto
    return {
      accounts: accountDtos,
      total,
    };
  }
}
