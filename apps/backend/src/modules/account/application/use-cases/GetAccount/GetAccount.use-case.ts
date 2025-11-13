import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ACCOUNT_REPOSITORY } from '../../../domain/constants/tokens';
import { IAccountRepository } from '../../../domain/interfaces/IAccountRepository';
import { UserEntity, Role } from '../../../../user/domain/entities/User.entity';
import { GetAccountResponseDto } from './GetAccount.dto';
import { AuditService } from '../../../../../shared/audit/audit.service';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { AccountMapper } from '../../../../../shared/mappers/account.mapper';

/**
 * Use Case: Obtener detalles de una cuenta por ID
 *
 * Reglas de negocio:
 * 1. SUPER_ADMIN puede ver cualquier cuenta (incluida Employees)
 * 2. ADMIN solo puede ver cuentas con isSystemAccount = false
 *    - Si intenta acceder a Employees u otra cuenta del sistema → ForbiddenException
 * 3. ACCOUNT_OWNER solo puede ver su propia cuenta (account.ownerId === currentUser.id)
 * 4. Otros roles (MEMBER, EDITOR) no tienen permiso de ver cuentas → ForbiddenException
 *
 * Validaciones de seguridad:
 * - Verifica que la cuenta existe
 * - Valida permisos multi-nivel según el rol
 * - Protege la cuenta Employees de acceso no autorizado
 */
@Injectable()
export class GetAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly auditService: AuditService
  ) {}

  async execute(accountId: string, currentUser: UserEntity): Promise<GetAccountResponseDto> {
    // 1. Buscar la cuenta por ID
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException(`Account with id "${accountId}" not found`);
    }

    // 2. Validar permisos según el rol del usuario

    if (currentUser.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN puede ver cualquier cuenta (incluida Employees) usando mapper centralizado
      return AccountMapper.toDto(account);
    }

    if (currentUser.role === Role.ADMIN) {
      // ADMIN solo puede ver cuentas de clientes (NO cuentas del sistema)
      if (account.isSystemAccount) {
        // Registrar intento de acceso a cuenta del sistema por ADMIN
        await this.auditService.logAccessDenied(
          currentUser,
          AuditResource.ACCOUNT,
          account.id,
          account.name,
          'ADMIN cannot access system accounts'
        );
        throw new ForbiddenException(`Access denied. ADMIN users cannot access system accounts`);
      }
      return AccountMapper.toDto(account);
    }

    if (currentUser.role === Role.ACCOUNT_OWNER) {
      // ACCOUNT_OWNER solo puede ver su propia cuenta
      if (account.ownerId !== currentUser.id) {
        throw new ForbiddenException(`Access denied. You can only access your own account`);
      }

      // También verificar que no sea cuenta del sistema (por seguridad)
      if (account.isSystemAccount) {
        throw new ForbiddenException(`Access denied. Cannot access system accounts`);
      }

      return AccountMapper.toDto(account);
    }

    // MEMBER, EDITOR y otros roles no tienen permiso
    throw new ForbiddenException(
      `Users with role ${currentUser.role} are not allowed to view account details`
    );
  }
}
