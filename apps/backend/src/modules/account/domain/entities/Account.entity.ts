import { Role, UserEntity } from '../../../user/domain/entities/User.entity';

export enum AccountStatus {
  PENDING = 'PENDING',     // Cuenta creada, esperando configuración
  ACTIVE = 'ACTIVE',       // Cuenta activa y operativa
  INACTIVE = 'INACTIVE',   // Cuenta desactivada temporalmente
  SUSPENDED = 'SUSPENDED', // Cuenta suspendida por violación de términos
}

export class AccountEntity {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly ownerId: string | null, // Propietario (se asigna después)
    public readonly createdBy: string, // Usuario que creó la cuenta (ADMIN/SUPER_ADMIN)
    public status: AccountStatus, // Estado de la cuenta
    public readonly isSystemAccount: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  /**
   * Determina si esta es la cuenta de empleados internos
   * @deprecated Usar isSystemAccount directamente en su lugar
   */
  isEmployeesAccount(): boolean {
    return this.isSystemAccount;
  }

  /**
   * Determina si la cuenta puede ser eliminada
   * Las cuentas del sistema (como Employees) no pueden ser eliminadas
   */
  canBeDeleted(): boolean {
    return !this.isSystemAccount;
  }

  /**
   * Determina si un usuario puede editar esta cuenta
   * @param user - Usuario que intenta editar la cuenta
   * @returns true si el usuario tiene permisos para editar esta cuenta
   */
  canBeEditedBy(user: UserEntity): boolean {
    // SUPER_ADMIN puede editar todas las cuentas, incluidas las del sistema
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Las cuentas del sistema solo pueden ser editadas por SUPER_ADMIN
    if (this.isSystemAccount) {
      return false;
    }

    // ADMIN puede editar cuentas de clientes (no del sistema)
    if (user.role === Role.ADMIN) {
      return true;
    }

    // ACCOUNT_OWNER puede editar solo su propia cuenta
    if (user.role === Role.ACCOUNT_OWNER && user.accountId === this.id) {
      return true;
    }

    // Otros roles no tienen permisos de edición
    return false;
  }

  /**
   * Actualiza el nombre de la cuenta
   * @throws Error si el nombre está vacío
   * @note Las restricciones de quién puede editar cuentas del sistema se manejan en canBeEditedBy()
   */
  updateName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Account name cannot be empty');
    }

    this.name = newName.trim();
    this.updatedAt = new Date();
  }
}
