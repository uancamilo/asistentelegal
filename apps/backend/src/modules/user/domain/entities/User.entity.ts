import { Email } from '../value-objects/Email.vo';
import type { AccountEntity } from '../../../account/domain/entities/Account.entity';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  ACCOUNT_OWNER = 'ACCOUNT_OWNER',
  MEMBER = 'MEMBER',
}

export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    private _passwordHash: string,
    public firstName: string,
    public lastName: string,
    public readonly role: Role,
    public status: UserStatus,
    public readonly accountId: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public tokenVersion: number = 0
  ) {}

  // Getters
  get passwordHash(): string {
    return this._passwordHash;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // ==========================================
  // MÉTODOS DE NEGOCIO - JERARQUÍA DE ROLES
  // ==========================================
  //
  // NOTA: Estos métodos de dominio están respaldados por la matriz de permisos
  // centralizada en src/shared/authorization/permissions.matrix.ts
  //
  // Para nuevas implementaciones, usar AuthorizationService para verificar permisos
  // Estos métodos se mantienen por compatibilidad y como lógica de dominio
  // ==========================================

  /**
   * Determina si este usuario puede crear un usuario con el rol especificado
   * Basado en la matriz de permisos centralizada
   *
   * SUPER_ADMIN: Puede crear todos los roles (SUPER_ADMIN, ADMIN, EDITOR, ACCOUNT_OWNER, MEMBER)
   * ADMIN: Solo puede crear ACCOUNT_OWNER
   * EDITOR: No puede crear usuarios
   * ACCOUNT_OWNER: Solo puede crear MEMBER en su cuenta
   * MEMBER: No puede crear usuarios
   */
  canCreateUser(targetRole: Role): boolean {
    const hierarchy: Record<Role, Role[]> = {
      // ✅ CORREGIDO: SUPER_ADMIN puede crear todos los roles incluyendo SUPER_ADMIN
      [Role.SUPER_ADMIN]: [
        Role.SUPER_ADMIN,
        Role.ADMIN,
        Role.EDITOR,
        Role.ACCOUNT_OWNER,
        Role.MEMBER,
      ],
      [Role.ADMIN]: [Role.ACCOUNT_OWNER], // ❌ NO puede crear MEMBER directamente
      [Role.EDITOR]: [], // ❌ NO puede crear usuarios
      [Role.ACCOUNT_OWNER]: [Role.MEMBER], // Solo MEMBER de su cuenta
      [Role.MEMBER]: [], // ❌ NO puede crear usuarios
    };

    return hierarchy[this.role]?.includes(targetRole) || false;
  }

  /**
   * Determina si este usuario puede gestionar empleados (ADMIN/EDITOR)
   * Solo SUPER_ADMIN puede gestionar empleados
   */
  canManageEmployees(): boolean {
    return this.role === Role.SUPER_ADMIN;
  }

  /**
   * Determina si este usuario es un empleado interno
   */
  isEmployee(): boolean {
    return [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR].includes(this.role);
  }

  /**
   * Determina si este usuario es un cliente
   */
  isClient(): boolean {
    return [Role.ACCOUNT_OWNER, Role.MEMBER].includes(this.role);
  }

  /**
   * Determina si este usuario puede acceder a una cuenta específica
   * Empleados: pueden acceder a todas las cuentas de clientes
   * EDITOR: NO puede acceder a cuentas (no gestiona cuentas)
   * Clientes: solo pueden acceder a su propia cuenta
   */
  canAccessAccount(accountId: string): boolean {
    // SUPER_ADMIN puede acceder a todas las cuentas (incluida "Employees")
    if (this.role === Role.SUPER_ADMIN) {
      return true;
    }

    // ADMIN puede acceder a todas las cuentas de clientes
    if (this.role === Role.ADMIN) {
      return true; // La validación de "Employees" se hará en el use case
    }

    // EDITOR NO puede acceder a cuentas (no gestiona cuentas)
    if (this.role === Role.EDITOR) {
      return false;
    }

    // Clientes (ACCOUNT_OWNER, MEMBER) solo pueden acceder a su propia cuenta
    return this.accountId === accountId;
  }

  /**
   * Determina si este usuario puede editar a otro usuario
   * Basado en la matriz de permisos confirmada
   */
  canEditUser(targetUser: UserEntity): boolean {
    // SUPER_ADMIN puede editar a todos (excepto otros SUPER_ADMIN)
    if (this.role === Role.SUPER_ADMIN) {
      if (targetUser.role === Role.SUPER_ADMIN && targetUser.id !== this.id) {
        return false; // No puede editar a otro SUPER_ADMIN
      }
      return true;
    }

    // ADMIN puede editar ACCOUNT_OWNER y MEMBER (soporte)
    // pero NO puede editar empleados (ADMIN/EDITOR)
    if (this.role === Role.ADMIN) {
      return [Role.ACCOUNT_OWNER, Role.MEMBER].includes(targetUser.role);
    }

    // EDITOR NO puede editar usuarios
    if (this.role === Role.EDITOR) {
      return false;
    }

    // ACCOUNT_OWNER puede editar MEMBER de su cuenta
    if (this.role === Role.ACCOUNT_OWNER) {
      return targetUser.role === Role.MEMBER && targetUser.accountId === this.accountId;
    }

    // MEMBER no puede editar usuarios (excepto su propio perfil)
    return false;
  }

  /**
   * Determina si este usuario puede editar una cuenta específica
   * Basado en la matriz de permisos confirmada
   * @param account - Entidad de cuenta a evaluar
   */
  canEditAccount(account: AccountEntity): boolean {
    // SUPER_ADMIN puede editar todas las cuentas (incluidas las del sistema)
    if (this.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Las cuentas del sistema solo pueden ser editadas por SUPER_ADMIN
    if (account.isSystemAccount) {
      return false; // ADMIN y otros roles no pueden editar cuentas del sistema
    }

    // ADMIN puede editar cuentas de clientes (no del sistema)
    if (this.role === Role.ADMIN) {
      return true;
    }

    // EDITOR NO puede editar cuentas
    if (this.role === Role.EDITOR) {
      return false;
    }

    // ACCOUNT_OWNER solo puede editar su propia cuenta
    if (this.role === Role.ACCOUNT_OWNER) {
      return account.ownerId === this.id;
    }

    // MEMBER no puede editar cuentas
    return false;
  }

  /**
   * Determina si este usuario puede ver contenido del sistema
   * Basado en la matriz de permisos confirmada
   */
  canViewContent(): boolean {
    // SUPER_ADMIN, EDITOR, ACCOUNT_OWNER, MEMBER pueden ver contenido
    // ADMIN NO puede ver contenido (no es su función)
    return [Role.SUPER_ADMIN, Role.EDITOR, Role.ACCOUNT_OWNER, Role.MEMBER].includes(this.role);
  }

  /**
   * Determina si este usuario puede gestionar contenido (crear, editar, publicar)
   * Basado en la matriz de permisos confirmada
   */
  canManageContent(): boolean {
    // Solo SUPER_ADMIN y EDITOR pueden gestionar contenido
    return [Role.SUPER_ADMIN, Role.EDITOR].includes(this.role);
  }

  /**
   * Determina si este usuario puede ver otros miembros de su cuenta
   * Basado en la matriz de permisos confirmada
   */
  canViewAccountMembers(_accountId: string): boolean {
    // SUPER_ADMIN puede ver todos los miembros de todas las cuentas
    if (this.role === Role.SUPER_ADMIN) {
      return true;
    }

    // ADMIN puede ver todos los miembros de todas las cuentas
    if (this.role === Role.ADMIN) {
      return true;
    }

    // EDITOR NO puede ver miembros de cuentas
    if (this.role === Role.EDITOR) {
      return false;
    }

    // ACCOUNT_OWNER puede ver miembros de su propia cuenta
    if (this.role === Role.ACCOUNT_OWNER) {
      return this.accountId === _accountId;
    }

    // MEMBER NO puede ver otros miembros de su cuenta
    return false;
  }

  // ==========================================
  // MÉTODOS DE ESTADO
  // ==========================================

  /**
   * Suspende al usuario
   * No se puede suspender a SUPER_ADMIN
   */
  suspend(): void {
    if (this.role === Role.SUPER_ADMIN) {
      throw new Error('Cannot suspend SUPER_ADMIN');
    }
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  /**
   * Reactiva al usuario
   */
  activate(): void {
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  /**
   * Actualiza el perfil del usuario
   */
  updateProfile(firstName: string, lastName: string): void {
    this.firstName = firstName;
    this.lastName = lastName;
    this.updatedAt = new Date();
  }

  /**
   * Actualiza el hash de password
   */
  updatePasswordHash(newPasswordHash: string): void {
    this._passwordHash = newPasswordHash;
    this.updatedAt = new Date();
  }
}
