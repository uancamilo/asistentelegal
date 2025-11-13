import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ACCOUNT_REPOSITORY } from '../../../domain/constants/tokens';
import { IAccountRepository } from '../../../domain/interfaces/IAccountRepository';
import { AccountEntity } from '../../../domain/entities/Account.entity';
import { UserEntity, Role } from '../../../../user/domain/entities/User.entity';
import { CreateAccountRequestDto, CreateAccountResponseDto } from './CreateAccount.dto';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { generateCuid } from '../../../../../shared/utils/cuid.util';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { AccountMapper } from '../../../../../shared/mappers/account.mapper';
import { PrismaService } from '../../../../../database/prisma.service';

/**
 * Use Case: Crear una nueva cuenta de cliente
 *
 * Reglas de negocio (Fase 1):
 * 1. Solo SUPER_ADMIN y ADMIN pueden crear cuentas
 * 2. El nombre de la cuenta debe ser único
 * 3. El ownerId se asignará posteriormente (inicia como NULL)
 * 4. El createdBy se asigna automáticamente al usuario autenticado
 * 5. El status inicial es PENDING (se activará en fase de configuración)
 * 6. NUNCA se puede crear una cuenta con isSystemAccount = true desde la API
 * 7. Las cuentas creadas siempre tienen isSystemAccount = false
 *
 * Validaciones de seguridad:
 * - Verifica permisos del usuario actual
 * - Previene duplicados de nombres
 * - Garantiza que no se creen cuentas del sistema
 * - Registra quién creó la cuenta para auditoría
 */
@Injectable()
export class CreateAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    dto: CreateAccountRequestDto,
    currentUser: UserEntity
  ): Promise<CreateAccountResponseDto> {
    // 1. Verificar permisos: Solo SUPER_ADMIN y ADMIN pueden crear cuentas
    if (![Role.SUPER_ADMIN, Role.ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException(
        `Users with role ${currentUser.role} are not allowed to create accounts`
      );
    }

    // 2. Validar que el nombre no esté vacío y normalizarlo a mayúsculas
    const accountName = dto.name.trim().toUpperCase();
    if (accountName.length === 0) {
      throw new BadRequestException('Account name cannot be empty');
    }

    // 3. Verificar que el nombre de cuenta no exista (unicidad)
    const existingAccount = await this.accountRepository.findByName(accountName);
    if (existingAccount) {
      throw new ConflictException(`Account with name "${accountName}" already exists`);
    }

    // 4. Crear la entidad de Account
    // IMPORTANTE:
    // - isSystemAccount siempre es false para cuentas creadas por API
    // - ownerId es NULL (se asignará en fase posterior de configuración)
    // - createdBy se asigna automáticamente al usuario autenticado
    // - status inicial es PENDING
    const accountId = this.generateAccountId();
    const now = new Date();

    const account = new AccountEntity(
      accountId,
      accountName,
      null, // ownerId - se asignará posteriormente
      currentUser.id, // createdBy - usuario que crea la cuenta
      'PENDING' as any, // status - cuenta en espera de configuración
      false, // isSystemAccount - SIEMPRE false desde API
      now,
      now
    );

    // 5. Guardar cuenta y auditoría en una transacción atómica
    // Garantiza que ambas operaciones se completen o ambas fallen
    const createdAccount = await this.prisma.$transaction(async (tx) => {
      // 5a. Guardar la cuenta en el repositorio
      const savedAccount = await tx.account.create({
        data: {
          id: account.id,
          name: account.name,
          ownerId: account.ownerId,
          createdBy: account.createdBy,
          status: account.status,
          isSystemAccount: account.isSystemAccount,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      });

      // 5b. Registrar en auditoría (dentro de la misma transacción)
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          userEmail: currentUser.email.getValue(),
          userRole: currentUser.role,
          action: AuditAction.CREATE,
          resource: AuditResource.ACCOUNT,
          resourceId: savedAccount.id,
          resourceName: savedAccount.name,
          details: {
            ownerId: savedAccount.ownerId,
            createdBy: savedAccount.createdBy,
            status: savedAccount.status,
            isSystemAccount: savedAccount.isSystemAccount,
          },
          success: true,
        },
      });

      return savedAccount;
    });

    // 6. Convertir a entidad de dominio y retornar respuesta usando el mapper centralizado
    const accountEntity = new AccountEntity(
      createdAccount.id,
      createdAccount.name,
      createdAccount.ownerId,
      createdAccount.createdBy,
      createdAccount.status as any,
      createdAccount.isSystemAccount,
      createdAccount.createdAt,
      createdAccount.updatedAt
    );

    return AccountMapper.toDto(accountEntity);
  }

  /**
   * Genera un ID único para la cuenta usando CUID2
   */
  private generateAccountId(): string {
    return generateCuid();
  }
}
