import { AccountInvitationEntity } from '../entities/AccountInvitation.entity';

/**
 * Interfaz del repositorio de invitaciones
 * Define las operaciones de persistencia para invitaciones
 */
export interface IInvitationRepository {
  /**
   * Busca una invitación por su ID
   */
  findById(id: string): Promise<AccountInvitationEntity | null>;

  /**
   * Busca una invitación por su token
   */
  findByToken(token: string): Promise<AccountInvitationEntity | null>;

  /**
   * Busca invitaciones pendientes para una cuenta
   */
  findPendingByAccountId(accountId: string): Promise<AccountInvitationEntity[]>;

  /**
   * Busca invitaciones por email
   * @param email - Email to search for
   * @param limit - Maximum number of results (default: 100) - PERFORMANCE FIX P3.4
   */
  findByEmail(email: string, limit?: number): Promise<AccountInvitationEntity[]>;

  /**
   * Crea una nueva invitación
   */
  create(invitation: AccountInvitationEntity): Promise<AccountInvitationEntity>;

  /**
   * Actualiza una invitación existente
   */
  update(id: string, data: Partial<AccountInvitationEntity>): Promise<AccountInvitationEntity>;

  /**
   * Elimina una invitación
   */
  delete(id: string): Promise<void>;

  /**
   * Busca invitaciones expiradas
   */
  findExpired(): Promise<AccountInvitationEntity[]>;

  /**
   * Verifica si existe una invitación pendiente para una cuenta
   */
  hasPendingInvitation(accountId: string): Promise<boolean>;
}
