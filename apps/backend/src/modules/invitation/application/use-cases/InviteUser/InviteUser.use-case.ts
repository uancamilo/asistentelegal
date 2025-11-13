import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ACCOUNT_REPOSITORY } from '../../../../account/domain/constants/tokens';
import { IAccountRepository } from '../../../../account/domain/interfaces/IAccountRepository';
import { UserEntity, Role } from '../../../../user/domain/entities/User.entity';
import {
  InviteUserRequestDto,
  InviteUserResponseDto,
} from './InviteUser.dto';
import { UserInvitationEntity } from '../../../domain/entities/UserInvitation.entity';
import { InvitationStatus } from '../../../domain/entities/AccountInvitation.entity';
import { generateCuid } from '../../../../../shared/utils/cuid.util';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { PrismaService } from '../../../../../database/prisma.service';
import { EmailService } from '../../../../../shared/email/email.service';

/**
 * Use Case: Invitar a un usuario para que se una a una cuenta
 *
 * Reglas de negocio:
 * 1. Solo SUPER_ADMIN puede enviar invitaciones a la cuenta EMPLEADOS
 * 2. ADMIN puede enviar invitaciones a cuentas de clientes
 * 3. La cuenta debe existir
 * 4. El email del invitado debe ser único (no existir en Users)
 * 5. Se genera un token UUID v4 único
 * 6. La invitación expira en 7 días
 * 7. Se envía email con link de activación
 * 8. Se registra en auditoría
 */
@Injectable()
export class InviteUserUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async execute(
    accountId: string,
    dto: InviteUserRequestDto,
    currentUser: UserEntity
  ): Promise<InviteUserResponseDto> {
    // 1. Verificar que la cuenta existe
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new NotFoundException(`Account with id "${accountId}" not found`);
    }

    // 2. Verificar permisos
    // SUPER_ADMIN puede invitar a cualquier cuenta (incluida EMPLEADOS)
    if (currentUser.role === Role.SUPER_ADMIN) {
      // Permitido
    }
    // ADMIN solo puede invitar a cuentas de clientes (no del sistema)
    else if (currentUser.role === Role.ADMIN) {
      if (account.isSystemAccount) {
        throw new ForbiddenException(
          'Admins cannot invite users to system accounts'
        );
      }
    }
    // Otros roles no tienen permiso
    else {
      throw new ForbiddenException(
        'You do not have permission to invite users'
      );
    }

    // 3. Verificar que el email no esté ya registrado
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException(
        `User with email "${dto.email}" already exists`
      );
    }

    // 4. Verificar que no exista una invitación PENDING para este email en esta cuenta
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        accountId: accountId,
        status: InvitationStatus.PENDING,
      },
    });
    if (existingInvitation) {
      throw new ConflictException(
        `A pending invitation for "${dto.email}" already exists for this account`
      );
    }

    // 5. Generar token único (UUID v4)
    const token = randomUUID();

    // 6. Calcular fecha de expiración (7 días desde ahora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 7. Crear entidad de invitación
    const invitationId = generateCuid();
    const now = new Date();

    const invitation = new UserInvitationEntity(
      invitationId,
      dto.email.toLowerCase().trim(),
      dto.firstName,
      dto.lastName,
      dto.role,
      token,
      accountId,
      expiresAt,
      InvitationStatus.PENDING,
      now,
      now
    );

    // 8. Guardar invitación y registrar auditoría en transacción
    const savedInvitation = await this.prisma.$transaction(async (tx) => {
      // 8a. Guardar invitación
      const saved = await tx.userInvitation.create({
        data: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: invitation.role,
          token: invitation.token,
          accountId: invitation.accountId,
          expiresAt: invitation.expiresAt,
          status: invitation.status,
          createdAt: invitation.createdAt,
          updatedAt: invitation.updatedAt,
        },
      });

      // 8b. Registrar auditoría
      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          userEmail: currentUser.email.getValue(),
          userRole: currentUser.role,
          action: AuditAction.CREATE,
          resource: AuditResource.INVITATION,
          resourceId: saved.id,
          resourceName: `${saved.firstName} ${saved.lastName}`,
          details: {
            email: saved.email,
            accountId: saved.accountId,
            accountName: account.name,
            role: saved.role,
            expiresAt: saved.expiresAt.toISOString(),
            invitationType: 'USER',
          },
          success: true,
        },
      });

      return saved;
    });

    // 9. Enviar email de invitación (asíncrono, no bloquear respuesta)
    this.emailService
      .sendUserInvitationEmail({
        to: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        accountName: account.name,
        role: invitation.role,
        inviterName: `${currentUser.firstName} ${currentUser.lastName}`,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      })
      .catch((error) => {
        console.error('Error sending user invitation email:', error);
        // No lanzar error, solo loguear
      });

    // 10. Retornar respuesta (sin exponer el token completo)
    return {
      id: savedInvitation.id,
      email: savedInvitation.email,
      firstName: savedInvitation.firstName,
      lastName: savedInvitation.lastName,
      role: savedInvitation.role,
      accountId: savedInvitation.accountId,
      expiresAt: savedInvitation.expiresAt,
      status: savedInvitation.status,
      createdAt: savedInvitation.createdAt,
    };
  }
}
