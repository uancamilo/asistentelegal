/**
 * Enum para el estado de una invitación
 */
export enum InvitationStatus {
  PENDING = 'PENDING',     // Invitación enviada, esperando aceptación
  ACCEPTED = 'ACCEPTED',   // Invitación aceptada y procesada
  EXPIRED = 'EXPIRED',     // Invitación expirada
  CANCELLED = 'CANCELLED', // Invitación cancelada por admin
}

/**
 * Entidad de dominio: AccountInvitation
 *
 * Representa una invitación enviada a un usuario para que se convierta en
 * ACCOUNT_OWNER de una cuenta específica.
 *
 * Reglas de negocio:
 * - Los tokens son únicos y tienen una expiración de 7 días
 * - Una vez aceptada, no puede volver a usarse
 * - Una cuenta solo puede tener una invitación PENDING a la vez
 * - Al expirar, el status debe cambiar a EXPIRED automáticamente
 */
export class AccountInvitationEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly token: string,
    public readonly accountId: string,
    public readonly maxUsers: number,
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
