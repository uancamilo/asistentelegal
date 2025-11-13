import { UserEntity, Role, UserStatus } from '../src/modules/user/domain/entities/User.entity';
import { AccountEntity, AccountStatus } from '../src/modules/account/domain/entities/Account.entity';
import { Email } from '../src/modules/user/domain/value-objects/Email.vo';

/**
 * Test suite para UserEntity - Método canEditAccount
 *
 * Objetivo: Verificar que la refactorización de canEditAccount() funciona correctamente
 * con el nuevo parámetro AccountEntity en lugar de parámetros individuales.
 *
 * Enfoque de las pruebas:
 * - Validar que canEditAccount() usa account.isSystemAccount correctamente
 * - Verificar la jerarquía de permisos RBAC
 * - Confirmar que las cuentas del sistema están protegidas
 * - Validar que SUPER_ADMIN tiene acceso completo
 */
describe('UserEntity - canEditAccount() with AccountEntity', () => {
  // Helper function para crear usuarios
  const createUser = (role: Role, id: string = 'user-id', accountId: string | null = null): UserEntity => {
    return new UserEntity(
      id,
      Email.create('test@example.com'),
      'hashedPassword',
      'Test',
      'User',
      role,
      UserStatus.ACTIVE,
      accountId,
      new Date(),
      new Date(),
      0
    );
  };

  // Helper function para crear cuentas
  const createAccount = (
    id: string,
    name: string,
    ownerId: string,
    isSystemAccount: boolean = false
  ): AccountEntity => {
    return new AccountEntity(id, name, ownerId, 'admin-id', AccountStatus.ACTIVE, isSystemAccount, new Date(), new Date());
  };

  describe('SUPER_ADMIN permissions', () => {
    it('should allow SUPER_ADMIN to edit client accounts', () => {
      const superAdmin = createUser(Role.SUPER_ADMIN);
      const clientAccount = createAccount('acc-1', 'Client Corp', 'owner-1', false);

      expect(superAdmin.canEditAccount(clientAccount)).toBe(true);
    });

    it('should allow SUPER_ADMIN to edit system accounts', () => {
      const superAdmin = createUser(Role.SUPER_ADMIN);
      const systemAccount = createAccount('acc-sys', 'Internal', 'admin-1', true);

      expect(superAdmin.canEditAccount(systemAccount)).toBe(true);
    });

    it('should allow SUPER_ADMIN to edit Employees account', () => {
      const superAdmin = createUser(Role.SUPER_ADMIN, 'admin-1');
      const employeesAccount = createAccount('emp-001', 'Employees', 'admin-1', true);

      expect(superAdmin.canEditAccount(employeesAccount)).toBe(true);
    });
  });

  describe('ADMIN permissions', () => {
    it('should allow ADMIN to edit client accounts', () => {
      const admin = createUser(Role.ADMIN);
      const clientAccount = createAccount('acc-1', 'Client Corp', 'owner-1', false);

      expect(admin.canEditAccount(clientAccount)).toBe(true);
    });

    it('should prevent ADMIN from editing system accounts', () => {
      const admin = createUser(Role.ADMIN);
      const systemAccount = createAccount('acc-sys', 'Internal', 'admin-1', true);

      expect(admin.canEditAccount(systemAccount)).toBe(false);
    });

    it('should prevent ADMIN from editing Employees account', () => {
      const admin = createUser(Role.ADMIN);
      const employeesAccount = createAccount('emp-001', 'Employees', 'superadmin-1', true);

      expect(admin.canEditAccount(employeesAccount)).toBe(false);
    });

    it('should allow ADMIN to edit multiple client accounts', () => {
      const admin = createUser(Role.ADMIN);
      const account1 = createAccount('acc-1', 'Client A', 'owner-1', false);
      const account2 = createAccount('acc-2', 'Client B', 'owner-2', false);
      const account3 = createAccount('acc-3', 'Client C', 'owner-3', false);

      expect(admin.canEditAccount(account1)).toBe(true);
      expect(admin.canEditAccount(account2)).toBe(true);
      expect(admin.canEditAccount(account3)).toBe(true);
    });
  });

  describe('EDITOR permissions', () => {
    it('should prevent EDITOR from editing client accounts', () => {
      const editor = createUser(Role.EDITOR);
      const clientAccount = createAccount('acc-1', 'Client Corp', 'owner-1', false);

      expect(editor.canEditAccount(clientAccount)).toBe(false);
    });

    it('should prevent EDITOR from editing system accounts', () => {
      const editor = createUser(Role.EDITOR);
      const systemAccount = createAccount('acc-sys', 'Internal', 'admin-1', true);

      expect(editor.canEditAccount(systemAccount)).toBe(false);
    });

    it('should prevent EDITOR from editing any account type', () => {
      const editor = createUser(Role.EDITOR);
      const clientAccount = createAccount('acc-1', 'Client', 'owner-1', false);
      const systemAccount = createAccount('acc-sys', 'System', 'admin-1', true);
      const employeesAccount = createAccount('emp-001', 'Employees', 'admin-1', true);

      expect(editor.canEditAccount(clientAccount)).toBe(false);
      expect(editor.canEditAccount(systemAccount)).toBe(false);
      expect(editor.canEditAccount(employeesAccount)).toBe(false);
    });
  });

  describe('ACCOUNT_OWNER permissions', () => {
    it('should allow ACCOUNT_OWNER to edit their own account', () => {
      const ownerId = 'owner-123';
      const accountId = 'acc-456';
      const accountOwner = createUser(Role.ACCOUNT_OWNER, ownerId, accountId);
      const ownAccount = createAccount(accountId, 'My Account', ownerId, false);

      expect(accountOwner.canEditAccount(ownAccount)).toBe(true);
    });

    it('should prevent ACCOUNT_OWNER from editing other accounts', () => {
      const accountOwner = createUser(Role.ACCOUNT_OWNER, 'owner-1', 'acc-1');
      const otherAccount = createAccount('acc-2', 'Other Account', 'owner-2', false);

      expect(accountOwner.canEditAccount(otherAccount)).toBe(false);
    });

    it('should prevent ACCOUNT_OWNER from editing system accounts', () => {
      const accountOwner = createUser(Role.ACCOUNT_OWNER, 'owner-1', 'acc-1');
      const systemAccount = createAccount('acc-sys', 'System', 'admin-1', true);

      expect(accountOwner.canEditAccount(systemAccount)).toBe(false);
    });

    it('should prevent ACCOUNT_OWNER from editing Employees account', () => {
      const accountOwner = createUser(Role.ACCOUNT_OWNER, 'owner-1', 'acc-1');
      const employeesAccount = createAccount('emp-001', 'Employees', 'admin-1', true);

      expect(accountOwner.canEditAccount(employeesAccount)).toBe(false);
    });

    it('should correctly check ownerId match', () => {
      const ownerId = 'owner-123';
      const accountOwner = createUser(Role.ACCOUNT_OWNER, ownerId, 'acc-1');

      // Cuenta con mismo ownerId - debe permitir
      const ownAccount = createAccount('acc-1', 'Own', ownerId, false);
      expect(accountOwner.canEditAccount(ownAccount)).toBe(true);

      // Cuenta con diferente ownerId - debe rechazar
      const otherAccount = createAccount('acc-2', 'Other', 'different-owner', false);
      expect(accountOwner.canEditAccount(otherAccount)).toBe(false);
    });
  });

  describe('MEMBER permissions', () => {
    it('should prevent MEMBER from editing their account', () => {
      const member = createUser(Role.MEMBER, 'member-1', 'acc-1');
      const account = createAccount('acc-1', 'Team Account', 'owner-1', false);

      expect(member.canEditAccount(account)).toBe(false);
    });

    it('should prevent MEMBER from editing other accounts', () => {
      const member = createUser(Role.MEMBER, 'member-1', 'acc-1');
      const otherAccount = createAccount('acc-2', 'Other Account', 'owner-2', false);

      expect(member.canEditAccount(otherAccount)).toBe(false);
    });

    it('should prevent MEMBER from editing system accounts', () => {
      const member = createUser(Role.MEMBER, 'member-1', 'acc-1');
      const systemAccount = createAccount('acc-sys', 'System', 'admin-1', true);

      expect(member.canEditAccount(systemAccount)).toBe(false);
    });

    it('should prevent MEMBER from editing any account type', () => {
      const member = createUser(Role.MEMBER, 'member-1', 'acc-1');
      const clientAccount = createAccount('acc-1', 'Client', 'owner-1', false);
      const systemAccount = createAccount('acc-sys', 'System', 'admin-1', true);
      const employeesAccount = createAccount('emp-001', 'Employees', 'admin-1', true);

      expect(member.canEditAccount(clientAccount)).toBe(false);
      expect(member.canEditAccount(systemAccount)).toBe(false);
      expect(member.canEditAccount(employeesAccount)).toBe(false);
    });
  });

  describe('System account protection', () => {
    it('should prevent all non-SUPER_ADMIN roles from editing system accounts', () => {
      const systemAccount = createAccount('acc-sys', 'System Account', 'admin-1', true);

      const admin = createUser(Role.ADMIN);
      const editor = createUser(Role.EDITOR);
      const accountOwner = createUser(Role.ACCOUNT_OWNER, 'owner-1', 'acc-1');
      const member = createUser(Role.MEMBER, 'member-1', 'acc-1');

      expect(admin.canEditAccount(systemAccount)).toBe(false);
      expect(editor.canEditAccount(systemAccount)).toBe(false);
      expect(accountOwner.canEditAccount(systemAccount)).toBe(false);
      expect(member.canEditAccount(systemAccount)).toBe(false);
    });

    it('should use isSystemAccount flag instead of name comparison', () => {
      // Cuenta con nombre "Employees" pero NO es cuenta del sistema
      const fakeEmployees = createAccount('acc-fake', 'Employees', 'owner-1', false);
      const admin = createUser(Role.ADMIN);

      // ADMIN debería poder editarla porque isSystemAccount=false
      expect(admin.canEditAccount(fakeEmployees)).toBe(true);
    });

    it('should protect any system account regardless of name', () => {
      // Cuenta del sistema con nombre diferente a "Employees"
      const customSystemAccount = createAccount('acc-sys', 'Internal Tools', 'admin-1', true);
      const admin = createUser(Role.ADMIN);

      // ADMIN NO debe poder editarla porque isSystemAccount=true
      expect(admin.canEditAccount(customSystemAccount)).toBe(false);
    });
  });

  describe('Integration scenarios with real AccountEntity', () => {
    it('should demonstrate complete authorization flow for client account', () => {
      const clientAccount = createAccount('acc-123', 'Acme Corp', 'owner-123', false);

      const superAdmin = createUser(Role.SUPER_ADMIN);
      const admin = createUser(Role.ADMIN);
      const editor = createUser(Role.EDITOR);
      const owner = createUser(Role.ACCOUNT_OWNER, 'owner-123', 'acc-123');
      const member = createUser(Role.MEMBER, 'member-456', 'acc-123');

      expect(superAdmin.canEditAccount(clientAccount)).toBe(true);
      expect(admin.canEditAccount(clientAccount)).toBe(true);
      expect(editor.canEditAccount(clientAccount)).toBe(false);
      expect(owner.canEditAccount(clientAccount)).toBe(true);
      expect(member.canEditAccount(clientAccount)).toBe(false);
    });

    it('should demonstrate Employees account is only editable by SUPER_ADMIN', () => {
      const employeesAccount = createAccount('emp-001', 'Employees', 'superadmin-1', true);

      const superAdmin = createUser(Role.SUPER_ADMIN, 'superadmin-1');
      const admin = createUser(Role.ADMIN);
      const editor = createUser(Role.EDITOR);
      const accountOwner = createUser(Role.ACCOUNT_OWNER, 'owner-1', 'acc-1');
      const member = createUser(Role.MEMBER, 'member-1', 'acc-1');

      // Solo SUPER_ADMIN puede editar
      expect(superAdmin.canEditAccount(employeesAccount)).toBe(true);

      // Todos los demás roles están bloqueados
      expect(admin.canEditAccount(employeesAccount)).toBe(false);
      expect(editor.canEditAccount(employeesAccount)).toBe(false);
      expect(accountOwner.canEditAccount(employeesAccount)).toBe(false);
      expect(member.canEditAccount(employeesAccount)).toBe(false);
    });

    it('should work correctly with AccountEntity methods', () => {
      const superAdmin = createUser(Role.SUPER_ADMIN, 'admin-1');
      const admin = createUser(Role.ADMIN);

      const employeesAccount = createAccount('emp-001', 'Employees', 'admin-1', true);

      // UserEntity.canEditAccount() debe coincidir con AccountEntity.canBeEditedBy()
      expect(superAdmin.canEditAccount(employeesAccount)).toBe(true);
      expect(employeesAccount.canBeEditedBy(superAdmin)).toBe(true);

      expect(admin.canEditAccount(employeesAccount)).toBe(false);
      expect(employeesAccount.canBeEditedBy(admin)).toBe(false);
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle account with null ownerId in comparison', () => {
      // Caso edge: cuenta sin owner explícito
      const orphanAccount = new AccountEntity(
        'acc-orphan',
        'Orphan Account',
        '', // ownerId vacío
        'admin-id',
        AccountStatus.ACTIVE,
        false,
        new Date(),
        new Date()
      );

      const accountOwner = createUser(Role.ACCOUNT_OWNER, 'owner-1', 'acc-orphan');

      // No debería permitir edición porque ownerId no coincide
      expect(accountOwner.canEditAccount(orphanAccount)).toBe(false);
    });

    it('should handle ACCOUNT_OWNER with null accountId', () => {
      const accountOwnerWithoutAccount = createUser(Role.ACCOUNT_OWNER, 'owner-1', null);
      const someAccount = createAccount('acc-1', 'Some Account', 'owner-1', false);

      // ACCOUNT_OWNER puede editar si es el owner, incluso con accountId=null
      // La verificación usa user.id === account.ownerId
      expect(accountOwnerWithoutAccount.canEditAccount(someAccount)).toBe(true);
    });

    it('should prioritize system account check before role-specific checks', () => {
      // ACCOUNT_OWNER que intenta editar cuenta del sistema donde es owner
      const ownerId = 'suspicious-owner';
      const suspiciousOwner = createUser(Role.ACCOUNT_OWNER, ownerId, 'acc-sys');
      const systemAccountOwnedByUser = createAccount('acc-sys', 'System', ownerId, true);

      // Debe rechazarse porque isSystemAccount=true tiene prioridad
      expect(suspiciousOwner.canEditAccount(systemAccountOwnedByUser)).toBe(false);
    });
  });
});
