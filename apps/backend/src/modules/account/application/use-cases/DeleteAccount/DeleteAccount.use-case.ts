import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IAccountRepository } from '../../../domain/interfaces/IAccountRepository';
import { IUserRepository } from '../../../../user/domain/interfaces/IUserRepository';
import { ACCOUNT_REPOSITORY } from '../../../domain/constants/tokens';
import { USER_REPOSITORY } from '../../../../user/domain/constants/tokens';
import { UserEntity, Role } from '../../../../user/domain/entities/User.entity';
import { DeleteAccountResponseDto } from './DeleteAccount.dto';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { PrismaService } from '../../../../../database/prisma.service';

/**
 * Use Case: Eliminar una cuenta
 *
 * Reglas de negocio:
 * 1. Solo SUPER_ADMIN puede eliminar cuentas
 * 2. No se pueden eliminar cuentas del sistema (isSystemAccount = true)
 * 3. No se pueden eliminar cuentas con usuarios activos
 * 4. Usa account.canBeDeleted() para validar si la cuenta puede ser eliminada
 */
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(accountId: string, currentUser: UserEntity): Promise<DeleteAccountResponseDto> {
    // 1. Verificar que solo SUPER_ADMIN puede eliminar cuentas
    if (currentUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete accounts');
    }

    // 2. Buscar la cuenta
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // 3. Verificar que la cuenta puede ser eliminada (no es cuenta del sistema)
    if (!account.canBeDeleted()) {
      throw new ForbiddenException('Cannot delete system account');
    }

    // 4. Verificar que no tenga usuarios activos asociados
    const usersInAccount = await this.userRepository.findByAccountId(accountId);
    if (usersInAccount.length > 0) {
      throw new ForbiddenException(
        `Cannot delete account with ${usersInAccount.length} active user(s)`
      );
    }

    // 5. Capturar datos de la cuenta antes de eliminar (para auditoría)
    const accountData = {
      id: account.id,
      name: account.name,
      ownerId: account.ownerId,
      isSystemAccount: account.isSystemAccount,
    };

    // 6-7. Eliminar cuenta y registrar auditoría en una transacción atómica
    // Garantiza que ambas operaciones se completen o ambas fallen
    await this.prisma.$transaction(async (tx) => {
      // 6a. Eliminar la cuenta
      await tx.account.delete({
        where: { id: accountId },
      });

      // 7a. Registrar en auditoría (dentro de la misma transacción)
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          userEmail: currentUser.email.getValue(),
          userRole: currentUser.role,
          action: AuditAction.DELETE,
          resource: AuditResource.ACCOUNT,
          resourceId: accountData.id,
          resourceName: accountData.name,
          details: {
            ownerId: accountData.ownerId,
            isSystemAccount: accountData.isSystemAccount,
          },
          success: true,
        },
      });
    });

    // 8. Retornar respuesta
    return {
      message: 'Account deleted successfully',
      id: accountId,
    };
  }
}
