import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { INVITATION_REPOSITORY } from '../../../domain/constants/tokens';
import { ACCOUNT_REPOSITORY } from '../../../../account/domain/constants/tokens';
import { IInvitationRepository } from '../../../domain/interfaces/IInvitationRepository';
import { IAccountRepository } from '../../../../account/domain/interfaces/IAccountRepository';
import { UserEntity, Role } from '../../../../user/domain/entities/User.entity';
import {
  InviteAccountOwnerRequestDto,
  InviteAccountOwnerResponseDto,
} from './InviteAccountOwner.dto';
import { AccountInvitationEntity, InvitationStatus } from '../../../domain/entities/AccountInvitation.entity';
import { generateCuid } from '../../../../../shared/utils/cuid.util';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { PrismaService } from '../../../../../database/prisma.service';
import { EmailService } from '../../../../../shared/email/email.service';

/**
 * Use Case: Invitar a un usuario para que sea ACCOUNT_OWNER de una cuenta
 *
 * Reglas de negocio:
 * 1. Solo SUPER_ADMIN y ADMIN pueden enviar invitaciones
 * 2. La cuenta debe existir y NO tener propietario asignado
 * 3. NO puede haber una invitación PENDING para la misma cuenta
 * 4. El email del invitado debe ser único (no existir en Users)
 * 5. Se genera un token UUID v4 único
 * 6. La invitación expira en 7 días
 * 7. Se envía email con link de activación
 * 8. Se registra en auditoría
 */
@Injectable()
export class InviteAccountOwnerUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async execute(
    accountId: string,
    dto: InviteAccountOwnerRequestDto,
    currentUser: UserEntity
  ): Promise<InviteAccountOwnerResponseDto> {
    // 1. Verificar permisos: Solo SUPER_ADMIN y ADMIN
    if (![Role.SUPER_ADMIN, Role.ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException(
        `Users with role ${currentUser.role} are not allowed to send invitations`
      );
    }

    // 2. Verificar que la cuenta existe
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundException(`Account with id "${accountId}" not found`);
    }

    // 3. Verificar que la cuenta NO tiene propietario asignado
    if (account.ownerId) {
      throw new ConflictException(
        `Account "${account.name}" already has an owner assigned`
      );
    }

    // 4. Verificar que NO existe una invitación PENDING para esta cuenta
    const hasPending = await this.invitationRepository.hasPendingInvitation(accountId);
    if (hasPending) {
      throw new ConflictException(
        `Account "${account.name}" already has a pending invitation`
      );
    }

    // 5. Verificar que el email no esté ya registrado
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException(
        `User with email "${dto.email}" already exists`
      );
    }

    // 6. Generar token único (UUID v4)
    const token = randomUUID();

    // 7. Calcular fecha de expiración (7 días desde ahora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 8. Crear entidad de invitación
    const invitationId = generateCuid();
    const now = new Date();

    const invitation = new AccountInvitationEntity(
      invitationId,
      dto.email.toLowerCase().trim(),
      token,
      accountId,
      dto.maxUsers,
      expiresAt,
      InvitationStatus.PENDING,
      now,
      now
    );

    // 9. Guardar invitación y registrar auditoría en transacción
    const savedInvitation = await this.prisma.$transaction(async (tx) => {
      // 9a. Guardar invitación
      const saved = await tx.accountInvitation.create({
        data: {
          id: invitation.id,
          email: invitation.email,
          token: invitation.token,
          accountId: invitation.accountId,
          maxUsers: invitation.maxUsers,
          expiresAt: invitation.expiresAt,
          status: invitation.status,
          createdAt: invitation.createdAt,
          updatedAt: invitation.updatedAt,
        },
      });

      // 9b. Registrar auditoría
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          userEmail: currentUser.email.getValue(),
          userRole: currentUser.role,
          action: AuditAction.CREATE,
          resource: AuditResource.INVITATION,
          resourceId: saved.id,
          resourceName: saved.email,
          details: {
            accountId: saved.accountId,
            accountName: account.name,
            maxUsers: saved.maxUsers,
            expiresAt: saved.expiresAt.toISOString(),
          },
          success: true,
        },
      });

      return saved;
    });

    // 10. Enviar email de invitación (asíncrono, no bloquear respuesta)
    this.emailService
      .sendInvitationEmail({
        to: invitation.email,
        accountName: account.name,
        inviterName: `${currentUser.firstName} ${currentUser.lastName}`,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      })
      .catch((error) => {
        console.error('Error sending invitation email:', error);
        // No lanzar error, solo loguear
      });

    // 11. Retornar respuesta (sin exponer el token completo)
    return {
      id: savedInvitation.id,
      email: savedInvitation.email,
      accountId: savedInvitation.accountId,
      maxUsers: savedInvitation.maxUsers,
      expiresAt: savedInvitation.expiresAt,
      status: savedInvitation.status,
      createdAt: savedInvitation.createdAt,
    };
  }
}
