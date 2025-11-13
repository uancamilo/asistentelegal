import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { INVITATION_REPOSITORY } from '../../../domain/constants/tokens';
import { ACCOUNT_REPOSITORY } from '../../../../account/domain/constants/tokens';
import { IInvitationRepository } from '../../../domain/interfaces/IInvitationRepository';
import { IAccountRepository } from '../../../../account/domain/interfaces/IAccountRepository';
import {
  AcceptInvitationRequestDto,
  AcceptInvitationResponseDto,
} from './AcceptInvitation.dto';
import { InvitationStatus } from '../../../domain/entities/AccountInvitation.entity';
import { generateCuid } from '../../../../../shared/utils/cuid.util';
import { AuditAction } from '../../../../../shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../../../shared/audit/enums/AuditResource.enum';
import { PrismaService } from '../../../../../database/prisma.service';
import { EmailService } from '../../../../../shared/email/email.service';

/**
 * Use Case: Aceptar una invitación y crear usuario ACCOUNT_OWNER
 *
 * Endpoint público (no requiere autenticación)
 *
 * Funcionalidad:
 * 1. Validar token de invitación
 * 2. Verificar que el email no esté registrado
 * 3. Crear nuevo usuario ACCOUNT_OWNER
 * 4. Actualizar cuenta: asignar ownerId, maxUsers, status ACTIVE
 * 5. Marcar invitación como ACCEPTED
 * 6. Registrar auditorías
 * 7. Enviar email de bienvenida
 * 8. Todo en transacción atómica
 */
@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async execute(dto: AcceptInvitationRequestDto): Promise<AcceptInvitationResponseDto> {
    // 1. Buscar invitación por token
    const invitation = await this.invitationRepository.findByToken(dto.token);

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // 2. Validar que la invitación puede ser aceptada
    if (!invitation.canBeAccepted()) {
      const reason =
        invitation.status === InvitationStatus.ACCEPTED
          ? 'This invitation has already been accepted'
          : invitation.status === InvitationStatus.CANCELLED
          ? 'This invitation has been cancelled'
          : 'This invitation has expired';

      throw new BadRequestException(reason);
    }

    // 3. Verificar que el email no esté ya registrado
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with email "${invitation.email}" already exists`
      );
    }

    // 4. Verificar que la cuenta existe y no tiene propietario
    const account = await this.accountRepository.findById(invitation.accountId);

    if (!account) {
      throw new BadRequestException('Account not found');
    }

    if (account.ownerId) {
      throw new ConflictException('Account already has an owner assigned');
    }

    // 5. Hashear la contraseña
    const passwordHash = await argon2.hash(dto.password);

    // 6. Crear usuario, actualizar cuenta, actualizar invitación en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // 6a. Crear nuevo usuario ACCOUNT_OWNER
      const userId = generateCuid();
      const now = new Date();

      const user = await tx.user.create({
        data: {
          id: userId,
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'ACCOUNT_OWNER',
          status: 'ACTIVE',
          accountId: invitation.accountId, // Asignar como miembro de la cuenta
          createdAt: now,
          updatedAt: now,
        },
      });

      // 6b. Actualizar cuenta: asignar owner, maxUsers y activar
      const updatedAccount = await tx.account.update({
        where: { id: invitation.accountId },
        data: {
          ownerId: user.id,
          maxUsers: invitation.maxUsers,
          status: 'ACTIVE',
          updatedAt: now,
        },
      });

      // 6c. Marcar invitación como aceptada
      const updatedInvitation = await tx.accountInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          updatedAt: now,
        },
      });

      // 6d. Registrar auditoría: creación de usuario
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          action: AuditAction.CREATE,
          resource: AuditResource.USER,
          resourceId: user.id,
          resourceName: `${user.firstName} ${user.lastName}`,
          details: {
            email: user.email,
            role: user.role,
            accountId: user.accountId,
            source: 'INVITATION_ACCEPTED',
          },
          success: true,
        },
      });

      // 6e. Registrar auditoría: activación de cuenta
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          action: AuditAction.UPDATE,
          resource: AuditResource.ACCOUNT,
          resourceId: updatedAccount.id,
          resourceName: updatedAccount.name,
          details: {
            changes: {
              ownerId: { from: null, to: user.id },
              maxUsers: { from: null, to: invitation.maxUsers },
              status: { from: 'PENDING', to: 'ACTIVE' },
            },
            source: 'INVITATION_ACCEPTED',
          },
          success: true,
        },
      });

      // 6f. Registrar auditoría: aceptación de invitación
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          action: AuditAction.UPDATE,
          resource: AuditResource.INVITATION,
          resourceId: updatedInvitation.id,
          resourceName: updatedInvitation.email,
          details: {
            accountId: updatedInvitation.accountId,
            status: 'ACCEPTED',
          },
          success: true,
        },
      });

      return { user, account: updatedAccount };
    });

    // 7. Enviar email de bienvenida (asíncrono, no bloquear)
    this.emailService
      .sendWelcomeEmail({
        to: result.user.email,
        firstName: result.user.firstName,
        accountName: result.account.name,
      })
      .catch((error) => {
        console.error('Error sending welcome email:', error);
      });

    // 8. Retornar respuesta (sin password)
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        status: result.user.status,
      },
      account: {
        id: result.account.id,
        name: result.account.name,
        status: result.account.status,
        maxUsers: result.account.maxUsers!,
      },
    };
  }
}
