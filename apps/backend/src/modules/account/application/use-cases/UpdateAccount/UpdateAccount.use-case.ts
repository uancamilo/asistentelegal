import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ACCOUNT_REPOSITORY } from '../../../domain/constants/tokens';
import { IAccountRepository } from '../../../domain/interfaces/IAccountRepository';
import { UserEntity } from '../../../../user/domain/entities/User.entity';
import { UpdateAccountRequestDto, UpdateAccountResponseDto } from './UpdateAccount.dto';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { AccountMapper } from '../../../../../shared/mappers/account.mapper';
import { PrismaService } from '../../../../../database/prisma.service';
import { AccountEntity } from '../../../domain/entities/Account.entity';

/**
 * Use Case: Actualizar una cuenta existente
 *
 * Reglas de negocio:
 * 1. Solo campos editables: name
 * 2. isSystemAccount NO puede ser cambiado (ni siquiera está en el DTO)
 * 3. ownerId NO puede ser cambiado
 * 4. Validar permisos usando account.canBeEditedBy(user)
 * 5. Si se cambia el nombre, validar unicidad
 * 6. Solo SUPER_ADMIN puede modificar cuentas del sistema (verificado en canBeEditedBy)
 * 7. Usar account.updateName() del dominio que ya tiene la validación
 *
 * Validaciones de seguridad:
 * - Verifica que la cuenta existe
 * - Valida permisos usando método de dominio (SUPER_ADMIN puede editar cuentas del sistema)
 * - ADMIN solo puede editar cuentas de clientes
 * - ACCOUNT_OWNER solo puede editar su propia cuenta
 * - Previene conflictos de nombres duplicados
 */
@Injectable()
export class UpdateAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    accountId: string,
    dto: UpdateAccountRequestDto,
    currentUser: UserEntity
  ): Promise<UpdateAccountResponseDto> {
    // 1. Buscar la cuenta por ID
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new NotFoundException(`Account with id "${accountId}" not found`);
    }

    // 2. Verificar permisos usando método de dominio
    if (!account.canBeEditedBy(currentUser)) {
      throw new ForbiddenException(`You do not have permission to edit this account`);
    }

    // 3. Procesar actualización de nombre (si se proporciona)
    if (dto.name !== undefined && dto.name !== null) {
      const newName = dto.name.trim().toUpperCase();

      // Solo actualizar si el nombre es diferente
      if (newName !== account.name) {
        // Validar que el nuevo nombre no exista
        const existingAccount = await this.accountRepository.findByName(newName);
        if (existingAccount && existingAccount.id !== accountId) {
          throw new ConflictException(`Account with name "${newName}" already exists`);
        }

        // Usar el método del dominio para actualizar el nombre
        // Los permisos ya fueron verificados con canBeEditedBy()
        // SUPER_ADMIN puede renombrar cuentas del sistema
        account.updateName(newName);
      }
    }

    // 4. Capturar valores antes de actualizar (para diff)
    const oldName = account.name;
    const newName = dto.name?.trim();

    // 5-6. Actualizar cuenta y auditoría en una transacción atómica
    // Garantiza que ambas operaciones se completen o ambas fallen
    const updatedAccount = await this.prisma.$transaction(async (tx) => {
      // 5a. Guardar cambios en el repositorio
      const saved = await tx.account.update({
        where: { id: accountId },
        data: {
          name: account.name,
          updatedAt: new Date(),
        },
      });

      // 6a. Registrar en auditoría con diff de cambios (dentro de la misma transacción)
      const changes: Record<string, any> = {};
      if (newName && oldName !== newName) {
        changes['name'] = { from: oldName, to: newName };
      }

      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          userEmail: currentUser.email.getValue(),
          userRole: currentUser.role,
          action: AuditAction.UPDATE,
          resource: AuditResource.ACCOUNT,
          resourceId: saved.id,
          resourceName: saved.name,
          details: changes,
          success: true,
        },
      });

      return saved;
    });

    // 7. Convertir a entidad de dominio y retornar respuesta usando el mapper centralizado
    const accountEntity = new AccountEntity(
      updatedAccount.id,
      updatedAccount.name,
      updatedAccount.ownerId,
      updatedAccount.createdBy,
      updatedAccount.status as any,
      updatedAccount.isSystemAccount,
      updatedAccount.createdAt,
      updatedAccount.updatedAt
    );

    return AccountMapper.toDto(accountEntity);
  }
}
