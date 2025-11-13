import { AccountEntity, AccountStatus } from '../src/modules/account/domain/entities/Account.entity';
import { UserEntity, Role, UserStatus } from '../src/modules/user/domain/entities/User.entity';
import { Email } from '../src/modules/user/domain/value-objects/Email.vo';

/**
 * Test suite para AccountEntity
 *
 * Objetivo: Verificar la lógica de negocio de la entidad Account,
 * especialmente las validaciones de seguridad relacionadas con
 * cuentas del sistema (isSystemAccount).
 *
 * Casos de prueba:
 * 1. Constructor y propiedades
 * 2. canBeDeleted() - protección de cuentas del sistema
 * 3. canBeEditedBy() - autorización basada en roles
 * 4. updateName() - validaciones de renombrado
 * 5. isEmployeesAccount() - compatibilidad (deprecated)
 */
describe('AccountEntity', () => {
  // Helper function para crear usuarios de prueba
  const createTestUser = (role: Role, accountId: string | null = null): UserEntity => {
    return new UserEntity(
      'user-id',
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

  // Helper function para crear cuentas de prueba
  const createTestAccount = (isSystemAccount: boolean = false): AccountEntity => {
    return new AccountEntity(
      'account-id',
      isSystemAccount ? 'Employees' : 'Client Account',
      'owner-id',
      'admin-id',
      AccountStatus.ACTIVE,
      isSystemAccount,
      new Date(),
      new Date()
    );
  };

  describe('Constructor y Propiedades', () => {
    it('should create a client account with correct properties', () => {
      const account = new AccountEntity(
        'acc-123',
        'My Account',
        'owner-456',
        'admin-id',
        AccountStatus.ACTIVE,
        false,
        new Date('2025-01-01'),
        new Date('2025-01-02')
      );

      expect(account.id).toBe('acc-123');
      expect(account.name).toBe('My Account');
      expect(account.ownerId).toBe('owner-456');
      expect(account.isSystemAccount).toBe(false);
      expect(account.createdAt).toEqual(new Date('2025-01-01'));
      expect(account.updatedAt).toEqual(new Date('2025-01-02'));
    });

    it('should create a system account (Employees) with isSystemAccount=true', () => {
      const account = new AccountEntity(
        'emp-001',
        'Employees',
        'superadmin-id',
        'superadmin-id',
        AccountStatus.ACTIVE,
        true,
        new Date(),
        new Date()
      );

      expect(account.isSystemAccount).toBe(true);
      expect(account.name).toBe('Employees');
    });
  });

  describe('canBeDeleted()', () => {
    it('should return true for client accounts', () => {
      const clientAccount = createTestAccount(false);
      expect(clientAccount.canBeDeleted()).toBe(true);
    });

    it('should return false for system accounts', () => {
      const systemAccount = createTestAccount(true);
      expect(systemAccount.canBeDeleted()).toBe(false);
    });

    it('should prevent deletion of Employees account', () => {
      const employeesAccount = new AccountEntity(
        'emp-001',
        'Employees',
        'superadmin-id',
        'superadmin-id',
        AccountStatus.ACTIVE,
        true,
        new Date(),
        new Date()
      );

      expect(employeesAccount.canBeDeleted()).toBe(false);
    });
  });

  describe('canBeEditedBy() - Authorization Logic', () => {
    describe('SUPER_ADMIN permissions', () => {
      it('should allow SUPER_ADMIN to edit client accounts', () => {
        const superAdmin = createTestUser(Role.SUPER_ADMIN);
        const clientAccount = createTestAccount(false);

        expect(clientAccount.canBeEditedBy(superAdmin)).toBe(true);
      });

      it('should allow SUPER_ADMIN to edit system accounts', () => {
        const superAdmin = createTestUser(Role.SUPER_ADMIN);
        const systemAccount = createTestAccount(true);

        expect(systemAccount.canBeEditedBy(superAdmin)).toBe(true);
      });

      it('should allow SUPER_ADMIN to edit Employees account', () => {
        const superAdmin = createTestUser(Role.SUPER_ADMIN);
        const employeesAccount = new AccountEntity(
          'emp-001',
          'Employees',
          'superadmin-id',
          'superadmin-id',
          AccountStatus.ACTIVE,
          true,
          new Date(),
          new Date()
        );

        expect(employeesAccount.canBeEditedBy(superAdmin)).toBe(true);
      });
    });

    describe('ADMIN permissions', () => {
      it('should allow ADMIN to edit client accounts', () => {
        const admin = createTestUser(Role.ADMIN);
        const clientAccount = createTestAccount(false);

        expect(clientAccount.canBeEditedBy(admin)).toBe(true);
      });

      it('should prevent ADMIN from editing system accounts', () => {
        const admin = createTestUser(Role.ADMIN);
        const systemAccount = createTestAccount(true);

        expect(systemAccount.canBeEditedBy(admin)).toBe(false);
      });

      it('should prevent ADMIN from editing Employees account', () => {
        const admin = createTestUser(Role.ADMIN);
        const employeesAccount = new AccountEntity(
          'emp-001',
          'Employees',
          'superadmin-id',
          'superadmin-id',
          AccountStatus.ACTIVE,
          true,
          new Date(),
          new Date()
        );

        expect(employeesAccount.canBeEditedBy(admin)).toBe(false);
      });
    });

    describe('EDITOR permissions', () => {
      it('should prevent EDITOR from editing any account', () => {
        const editor = createTestUser(Role.EDITOR);
        const clientAccount = createTestAccount(false);

        expect(clientAccount.canBeEditedBy(editor)).toBe(false);
      });

      it('should prevent EDITOR from editing system accounts', () => {
        const editor = createTestUser(Role.EDITOR);
        const systemAccount = createTestAccount(true);

        expect(systemAccount.canBeEditedBy(editor)).toBe(false);
      });
    });

    describe('ACCOUNT_OWNER permissions', () => {
      it('should allow ACCOUNT_OWNER to edit their own account', () => {
        const ownerId = 'owner-123';
        const accountOwner = createTestUser(Role.ACCOUNT_OWNER, 'acc-456');
        const ownAccount = new AccountEntity(
          'acc-456',
          'Own Account',
          ownerId,
          'admin-id',
          AccountStatus.ACTIVE,
          false,
          new Date(),
          new Date()
        );

        // Simular que el usuario es dueño de la cuenta
        const ownerWithCorrectId = new UserEntity(
          ownerId,
          accountOwner.email,
          accountOwner.passwordHash,
          accountOwner.firstName,
          accountOwner.lastName,
          Role.ACCOUNT_OWNER,
          UserStatus.ACTIVE,
          'acc-456',
          accountOwner.createdAt,
          accountOwner.updatedAt,
          0
        );

        expect(ownAccount.canBeEditedBy(ownerWithCorrectId)).toBe(true);
      });

      it('should prevent ACCOUNT_OWNER from editing other accounts', () => {
        const accountOwner = createTestUser(Role.ACCOUNT_OWNER, 'acc-456');
        const otherAccount = new AccountEntity(
          'acc-789',
          'Other Account',
          'other-owner-id',
          'admin-id',
          AccountStatus.ACTIVE,
          false,
          new Date(),
          new Date()
        );

        expect(otherAccount.canBeEditedBy(accountOwner)).toBe(false);
      });

      it('should prevent ACCOUNT_OWNER from editing system accounts', () => {
        const accountOwner = createTestUser(Role.ACCOUNT_OWNER, 'acc-456');
        const systemAccount = createTestAccount(true);

        expect(systemAccount.canBeEditedBy(accountOwner)).toBe(false);
      });
    });

    describe('MEMBER permissions', () => {
      it('should prevent MEMBER from editing any account', () => {
        const member = createTestUser(Role.MEMBER, 'acc-456');
        const clientAccount = createTestAccount(false);

        expect(clientAccount.canBeEditedBy(member)).toBe(false);
      });

      it('should prevent MEMBER from editing their own account', () => {
        const member = createTestUser(Role.MEMBER, 'acc-456');
        const ownAccount = new AccountEntity(
          'acc-456',
          'Own Account',
          'owner-id',
          'admin-id',
          AccountStatus.ACTIVE,
          false,
          new Date(),
          new Date()
        );

        expect(ownAccount.canBeEditedBy(member)).toBe(false);
      });
    });
  });

  describe('updateName()', () => {
    describe('Valid name updates', () => {
      it('should update name of client account successfully', () => {
        const account = createTestAccount(false);
        const originalUpdatedAt = account.updatedAt;

        // Esperar 10ms para asegurar que updatedAt cambie
        setTimeout(() => {
          account.updateName('New Account Name');

          expect(account.name).toBe('New Account Name');
          expect(account.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 10);
      });

      it('should trim whitespace from new name', () => {
        const account = createTestAccount(false);

        account.updateName('  Trimmed Name  ');

        expect(account.name).toBe('Trimmed Name');
      });

      it('should accept names with special characters', () => {
        const account = createTestAccount(false);

        account.updateName('Acme Corp. & Associates');

        expect(account.name).toBe('Acme Corp. & Associates');
      });
    });

    describe('Invalid name updates', () => {
      it('should reject empty name', () => {
        const account = createTestAccount(false);

        expect(() => account.updateName('')).toThrow('Account name cannot be empty');
      });

      it('should reject name with only whitespace', () => {
        const account = createTestAccount(false);

        expect(() => account.updateName('   ')).toThrow('Account name cannot be empty');
      });
    });

    describe('System account protection', () => {
      it('should prevent renaming system accounts', () => {
        const systemAccount = createTestAccount(true);

        expect(() => systemAccount.updateName('New Name')).toThrow(
          'System accounts cannot be renamed'
        );
      });

      it('should prevent renaming Employees account', () => {
        const employeesAccount = new AccountEntity(
          'emp-001',
          'Employees',
          'superadmin-id',
          'superadmin-id',
          AccountStatus.ACTIVE,
          true,
          new Date(),
          new Date()
        );

        expect(() => employeesAccount.updateName('Internal Staff')).toThrow(
          'System accounts cannot be renamed'
        );
      });

      it('should reject rename attempt before validating name format', () => {
        const systemAccount = createTestAccount(true);

        // La protección de cuentas del sistema debe verificarse ANTES de validar el nombre
        expect(() => systemAccount.updateName('')).toThrow('System accounts cannot be renamed');
      });
    });
  });

  describe('isEmployeesAccount() - Deprecated method', () => {
    it('should return true for system accounts', () => {
      const systemAccount = createTestAccount(true);

      expect(systemAccount.isEmployeesAccount()).toBe(true);
    });

    it('should return false for client accounts', () => {
      const clientAccount = createTestAccount(false);

      expect(clientAccount.isEmployeesAccount()).toBe(false);
    });

    it('should use isSystemAccount flag instead of name comparison', () => {
      // Caso edge: cuenta con nombre "Employees" pero isSystemAccount=false
      const fakeEmployees = new AccountEntity(
        'fake-001',
        'Employees',
        'owner-id',
        'admin-id',
        AccountStatus.ACTIVE,
        false, // NO es cuenta del sistema
        new Date(),
        new Date()
      );

      expect(fakeEmployees.isEmployeesAccount()).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should protect system account from deletion and renaming by ADMIN', () => {
      const admin = createTestUser(Role.ADMIN);
      const employeesAccount = new AccountEntity(
        'emp-001',
        'Employees',
        'superadmin-id',
        'superadmin-id',
        AccountStatus.ACTIVE,
        true,
        new Date(),
        new Date()
      );

      // ADMIN no puede editar
      expect(employeesAccount.canBeEditedBy(admin)).toBe(false);

      // Cuenta no puede ser eliminada
      expect(employeesAccount.canBeDeleted()).toBe(false);

      // Cuenta no puede ser renombrada
      expect(() => employeesAccount.updateName('Staff')).toThrow(
        'System accounts cannot be renamed'
      );
    });

    it('should allow SUPER_ADMIN full control over system account', () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const employeesAccount = new AccountEntity(
        'emp-001',
        'Employees',
        'superadmin-id',
        'superadmin-id',
        AccountStatus.ACTIVE,
        true,
        new Date(),
        new Date()
      );

      // SUPER_ADMIN puede editar
      expect(employeesAccount.canBeEditedBy(superAdmin)).toBe(true);

      // Pero la cuenta sigue siendo protegida contra eliminación y renombrado
      expect(employeesAccount.canBeDeleted()).toBe(false);
      expect(() => employeesAccount.updateName('Staff')).toThrow(
        'System accounts cannot be renamed'
      );
    });

    it('should allow normal operations on client accounts', () => {
      const accountOwner = new UserEntity(
        'owner-id',
        Email.create('owner@example.com'),
        'hash',
        'Owner',
        'User',
        Role.ACCOUNT_OWNER,
        UserStatus.ACTIVE,
        'acc-123',
        new Date(),
        new Date(),
        0
      );

      const clientAccount = new AccountEntity(
        'acc-123',
        'Client Account',
        'owner-id',
        'admin-id',
        AccountStatus.ACTIVE,
        false,
        new Date(),
        new Date()
      );

      // Cliente puede editar su propia cuenta
      expect(clientAccount.canBeEditedBy(accountOwner)).toBe(true);

      // Cuenta puede ser eliminada
      expect(clientAccount.canBeDeleted()).toBe(true);

      // Cuenta puede ser renombrada
      expect(() => clientAccount.updateName('New Name')).not.toThrow();
      expect(clientAccount.name).toBe('New Name');
    });
  });
});
