import { Injectable, Inject } from '@nestjs/common';
import { INVITATION_REPOSITORY } from '../../../domain/constants/tokens';
import { ACCOUNT_REPOSITORY } from '../../../../account/domain/constants/tokens';
import { IInvitationRepository } from '../../../domain/interfaces/IInvitationRepository';
import { IAccountRepository } from '../../../../account/domain/interfaces/IAccountRepository';
import { ValidateInvitationResponseDto } from './ValidateInvitation.dto';
import { InvitationStatus } from '../../../domain/entities/AccountInvitation.entity';

/**
 * Use Case: Validar una invitación por token
 *
 * Endpoint público (no requiere autenticación)
 *
 * Funcionalidad:
 * 1. Buscar invitación por token
 * 2. Verificar que existe
 * 3. Verificar estado (PENDING, ACCEPTED, EXPIRED, CANCELLED)
 * 4. Verificar fecha de expiración
 * 5. Si expiró, actualizar estado a EXPIRED
 * 6. Retornar validez y datos básicos
 */
@Injectable()
export class ValidateInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: IInvitationRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository
  ) {}

  async execute(token: string): Promise<ValidateInvitationResponseDto> {
    // 1. Buscar invitación por token
    const invitation = await this.invitationRepository.findByToken(token);

    // 2. Token no encontrado
    if (!invitation) {
      return {
        valid: false,
        reason: 'TOKEN_NOT_FOUND',
      };
    }

    // 3. Verificar estado de la invitación
    if (invitation.status === InvitationStatus.ACCEPTED) {
      return {
        valid: false,
        reason: 'ALREADY_ACCEPTED',
      };
    }

    if (invitation.status === InvitationStatus.CANCELLED) {
      return {
        valid: false,
        reason: 'ALREADY_CANCELLED',
      };
    }

    // 4. Verificar expiración
    if (invitation.isExpired()) {
      // Actualizar estado a EXPIRED si aún está PENDING
      if (invitation.status === InvitationStatus.PENDING) {
        invitation.markAsExpired();
        await this.invitationRepository.update(invitation.id, {
          status: InvitationStatus.EXPIRED,
        });
      }

      return {
        valid: false,
        reason: 'TOKEN_EXPIRED',
      };
    }

    // 5. Invitación válida - obtener información de la cuenta
    const account = await this.accountRepository.findById(invitation.accountId);

    if (!account) {
      // Caso improbable: la cuenta fue eliminada
      return {
        valid: false,
        reason: 'ACCOUNT_NOT_FOUND',
      };
    }

    // 6. Retornar invitación válida con datos
    return {
      valid: true,
      email: invitation.email,
      accountName: account.name,
      maxUsers: invitation.maxUsers,
    };
  }
}
