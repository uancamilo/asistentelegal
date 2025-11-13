/**
 * Entidad de dominio: UserInvitation
 *
 * Representa una invitación enviada a un usuario para que se una a una cuenta
 * con un rol específico (no como ACCOUNT_OWNER).
 *
 * Reglas de negocio:
 * - Los tokens son únicos y tienen una expiración de 7 días
 * - Una vez aceptada, no puede volver a usarse
 * - Al expirar, el status debe cambiar a EXPIRED automáticamente
 */

import { InvitationStatus } from './AccountInvitation.entity';

export class UserInvitationEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: string,
    public readonly token: string,
    public readonly accountId: string,
    public readonly expiresAt: Date,
    public status: InvitationStatus,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Verifica si la invitación ha expirado
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Verifica si la invitación es válida para ser aceptada
   */
  canBeAccepted(): boolean {
    return this.status === InvitationStatus.PENDING && !this.isExpired();
  }

  /**
   * Marca la invitación como aceptada
   */
  markAsAccepted(): void {
    if (!this.canBeAccepted()) {
      throw new Error('Invitation cannot be accepted');
    }
    this.status = InvitationStatus.ACCEPTED;
    this.updatedAt = new Date();
  }

  /**
   * Marca la invitación como expirada
   */
  markAsExpired(): void {
    if (this.status !== InvitationStatus.PENDING) {
      throw new Error('Only pending invitations can be marked as expired');
    }
    this.status = InvitationStatus.EXPIRED;
    this.updatedAt = new Date();
  }

  /**
   * Marca la invitación como cancelada
   */
  markAsCancelled(): void {
    if (this.status !== InvitationStatus.PENDING) {
      throw new Error('Only pending invitations can be cancelled');
    }
    this.status = InvitationStatus.CANCELLED;
    this.updatedAt = new Date();
  }
}
