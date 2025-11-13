/**
 * Tests Unitarios de AuthorizationService
 *
 * Verifica la consolidación de lógica de autorización para Account
 */

import { AuthorizationService } from '../../../src/shared/authorization/authorization.service';
import { Role } from '../../../src/modules/user/domain/entities/User.entity';
import { Action } from '../../../src/shared/authorization/permissions.constants';

describe('AuthorizationService - Account Methods', () => {
  let service: AuthorizationService;

  beforeEach(() => {
    service = new AuthorizationService();
  });

  describe('canCreateAccount', () => {
    it('should allow SUPER_ADMIN to create account', () => {
      expect(service.canCreateAccount(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should allow ADMIN to create account', () => {
      expect(service.canCreateAccount(Role.ADMIN)).toBe(true);
    });

    it('should reject EDITOR creating account', () => {
      expect(service.canCreateAccount(Role.EDITOR)).toBe(false);
    });

    it('should reject ACCOUNT_OWNER creating account', () => {
      expect(service.canCreateAccount(Role.ACCOUNT_OWNER)).toBe(false);
    });

    it('should reject MEMBER creating account', () => {
      expect(service.canCreateAccount(Role.MEMBER)).toBe(false);
    });
  });

  describe('canListAccounts', () => {
    it('should allow SUPER_ADMIN to list accounts', () => {
      expect(service.canListAccounts(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should allow ADMIN to list accounts', () => {
      expect(service.canListAccounts(Role.ADMIN)).toBe(true);
    });

    it('should reject EDITOR listing accounts', () => {
      expect(service.canListAccounts(Role.EDITOR)).toBe(false);
    });

    it('should reject ACCOUNT_OWNER listing accounts', () => {
      expect(service.canListAccounts(Role.ACCOUNT_OWNER)).toBe(false);
    });

    it('should reject MEMBER listing accounts', () => {
      expect(service.canListAccounts(Role.MEMBER)).toBe(false);
    });
  });

  describe('canAccessAccount', () => {
    const userAccountId = 'account-456';
    const targetAccountId = 'account-789';
    const employeesAccountId = 'employees-account-id';

    describe('SUPER_ADMIN', () => {
      it('should allow access to any client account', () => {
        const result = service.canAccessAccount(
          Role.SUPER_ADMIN,
          userAccountId,
          targetAccountId,
          false // not system account
        );
        expect(result).toBe(true);
      });

      it('should allow access to Employees account', () => {
        const result = service.canAccessAccount(
          Role.SUPER_ADMIN,
          userAccountId,
          employeesAccountId,
          true // system account
        );
        expect(result).toBe(true);
      });

      it('should allow access to any system account', () => {
        const result = service.canAccessAccount(
          Role.SUPER_ADMIN,
          userAccountId,
          'any-system-account',
          true // system account
        );
        expect(result).toBe(true);
      });
    });

    describe('ADMIN', () => {
      it('should allow access to client accounts', () => {
        const result = service.canAccessAccount(
          Role.ADMIN,
          userAccountId,
          targetAccountId,
          false // not system account
        );
        expect(result).toBe(true);
      });

      it('should reject access to Employees account', () => {
        const result = service.canAccessAccount(
          Role.ADMIN,
          userAccountId,
          employeesAccountId,
          true // system account
        );
        expect(result).toBe(false);
      });

      it('should reject access to any system account', () => {
        const result = service.canAccessAccount(
          Role.ADMIN,
          userAccountId,
          'any-system-account',
          true // system account
        );
        expect(result).toBe(false);
      });
    });

    describe('ACCOUNT_OWNER', () => {
      it('should allow access to own account', () => {
        const result = service.canAccessAccount(
          Role.ACCOUNT_OWNER,
          userAccountId,
          userAccountId, // same account
          false
        );
        expect(result).toBe(true);
      });

      it('should reject access to another account', () => {
        const result = service.canAccessAccount(
          Role.ACCOUNT_OWNER,
          userAccountId,
          targetAccountId, // different account
          false
        );
        expect(result).toBe(false);
      });

      it('should reject access to Employees account', () => {
        const result = service.canAccessAccount(
          Role.ACCOUNT_OWNER,
          userAccountId,
          employeesAccountId,
          true // system account
        );
        expect(result).toBe(false);
      });
    });

    describe('MEMBER', () => {
      it('should reject access to any account', () => {
        const result = service.canAccessAccount(
          Role.MEMBER,
          userAccountId,
          targetAccountId,
          false
        );
        expect(result).toBe(false);
      });

      it('should reject access to own account', () => {
        const result = service.canAccessAccount(
          Role.MEMBER,
          userAccountId,
          userAccountId, // same account
          false
        );
        expect(result).toBe(false);
      });
    });

    describe('EDITOR', () => {
      it('should reject access to any account', () => {
        const result = service.canAccessAccount(
          Role.EDITOR,
          userAccountId,
          targetAccountId,
          false
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('canEditAccount', () => {
    const userAccountId = 'account-456';
    const targetAccountId = 'account-789';
    const employeesAccountId = 'employees-account-id';

    describe('SUPER_ADMIN', () => {
      it('should allow editing any client account', () => {
        const result = service.canEditAccount(
          Role.SUPER_ADMIN,
          userAccountId,
          targetAccountId,
          false // not system account
        );
        expect(result).toBe(true);
      });

      it('should allow editing Employees account', () => {
        const result = service.canEditAccount(
          Role.SUPER_ADMIN,
          userAccountId,
          employeesAccountId,
          true // system account
        );
        expect(result).toBe(true);
      });

      it('should allow editing any system account', () => {
        const result = service.canEditAccount(
          Role.SUPER_ADMIN,
          userAccountId,
          'any-system-account',
          true // system account
        );
        expect(result).toBe(true);
      });
    });

    describe('ADMIN', () => {
      it('should allow editing client accounts', () => {
        const result = service.canEditAccount(
          Role.ADMIN,
          userAccountId,
          targetAccountId,
          false // not system account
        );
        expect(result).toBe(true);
      });

      it('should reject editing Employees account', () => {
        const result = service.canEditAccount(
          Role.ADMIN,
          userAccountId,
          employeesAccountId,
          true // system account
        );
        expect(result).toBe(false);
      });

      it('should reject editing any system account', () => {
        const result = service.canEditAccount(
          Role.ADMIN,
          userAccountId,
          'any-system-account',
          true // system account
        );
        expect(result).toBe(false);
      });
    });

    describe('ACCOUNT_OWNER', () => {
      it('should allow editing own account', () => {
        const result = service.canEditAccount(
          Role.ACCOUNT_OWNER,
          userAccountId,
          userAccountId, // same account
          false
        );
        expect(result).toBe(true);
      });

      it('should reject editing another account', () => {
        const result = service.canEditAccount(
          Role.ACCOUNT_OWNER,
          userAccountId,
          targetAccountId, // different account
          false
        );
        expect(result).toBe(false);
      });

      it('should reject editing Employees account', () => {
        const result = service.canEditAccount(
          Role.ACCOUNT_OWNER,
          userAccountId,
          employeesAccountId,
          true // system account
        );
        expect(result).toBe(false);
      });
    });

    describe('MEMBER', () => {
      it('should reject editing any account', () => {
        const result = service.canEditAccount(
          Role.MEMBER,
          userAccountId,
          targetAccountId,
          false
        );
        expect(result).toBe(false);
      });

      it('should reject editing own account', () => {
        const result = service.canEditAccount(
          Role.MEMBER,
          userAccountId,
          userAccountId, // same account
          false
        );
        expect(result).toBe(false);
      });
    });

    describe('EDITOR', () => {
      it('should reject editing any account', () => {
        const result = service.canEditAccount(
          Role.EDITOR,
          userAccountId,
          targetAccountId,
          false
        );
        expect(result).toBe(false);
      });
    });
  });

  describe('canDeleteAccount', () => {
    describe('SUPER_ADMIN', () => {
      it('should allow deleting client accounts', () => {
        const result = service.canDeleteAccount(
          Role.SUPER_ADMIN,
          false // not system account
        );
        expect(result).toBe(true);
      });

      it('should reject deleting Employees account', () => {
        const result = service.canDeleteAccount(
          Role.SUPER_ADMIN,
          true // system account
        );
        expect(result).toBe(false);
      });

      it('should reject deleting any system account', () => {
        const result = service.canDeleteAccount(
          Role.SUPER_ADMIN,
          true // system account
        );
        expect(result).toBe(false);
      });
    });

    describe('ADMIN', () => {
      it('should reject deleting any account', () => {
        const result = service.canDeleteAccount(
          Role.ADMIN,
          false // client account
        );
        expect(result).toBe(false);
      });

      it('should reject deleting system account', () => {
        const result = service.canDeleteAccount(
          Role.ADMIN,
          true // system account
        );
        expect(result).toBe(false);
      });
    });

    describe('ACCOUNT_OWNER', () => {
      it('should reject deleting any account', () => {
        const result = service.canDeleteAccount(
          Role.ACCOUNT_OWNER,
          false
        );
        expect(result).toBe(false);
      });
    });

    describe('MEMBER', () => {
      it('should reject deleting any account', () => {
        const result = service.canDeleteAccount(
          Role.MEMBER,
          false
        );
        expect(result).toBe(false);
      });
    });

    describe('EDITOR', () => {
      it('should reject deleting any account', () => {
        const result = service.canDeleteAccount(
          Role.EDITOR,
          false
        );
        expect(result).toBe(false);
      });
    });
  });

  // ========================================================================
  // TESTS DE MÉTODOS GENÉRICOS (ya existían)
  // ========================================================================

  describe('can', () => {
    it('should grant SUPER_ADMIN all permissions', () => {
      expect(service.can(Role.SUPER_ADMIN, Action.CREATE_ACCOUNT)).toBe(true);
      expect(service.can(Role.SUPER_ADMIN, Action.DELETE_ACCOUNT)).toBe(true);
      expect(service.can(Role.SUPER_ADMIN, Action.VIEW_ALL_ACCOUNTS)).toBe(true);
    });

    it('should grant ADMIN specific permissions', () => {
      expect(service.can(Role.ADMIN, Action.CREATE_ACCOUNT)).toBe(true);
      expect(service.can(Role.ADMIN, Action.VIEW_CLIENT_ACCOUNTS)).toBe(true);
      expect(service.can(Role.ADMIN, Action.DELETE_ACCOUNT)).toBe(false);
    });

    it('should deny non-authorized actions', () => {
      expect(service.can(Role.MEMBER, Action.CREATE_ACCOUNT)).toBe(false);
      expect(service.can(Role.EDITOR, Action.DELETE_ACCOUNT)).toBe(false);
    });
  });

  describe('canAll', () => {
    it('should return true if role has all specified actions', () => {
      const result = service.canAll(Role.SUPER_ADMIN, [
        Action.CREATE_ACCOUNT,
        Action.DELETE_ACCOUNT,
        Action.VIEW_ALL_ACCOUNTS,
      ]);
      expect(result).toBe(true);
    });

    it('should return false if role lacks any action', () => {
      const result = service.canAll(Role.ADMIN, [
        Action.CREATE_ACCOUNT,
        Action.DELETE_ACCOUNT, // ADMIN no tiene este permiso
      ]);
      expect(result).toBe(false);
    });
  });

  describe('canAny', () => {
    it('should return true if role has at least one action', () => {
      const result = service.canAny(Role.ADMIN, [
        Action.CREATE_ACCOUNT,
        Action.DELETE_ACCOUNT, // ADMIN no tiene este
      ]);
      expect(result).toBe(true);
    });

    it('should return false if role has none of the actions', () => {
      const result = service.canAny(Role.MEMBER, [
        Action.CREATE_ACCOUNT,
        Action.DELETE_ACCOUNT,
        Action.EDIT_CLIENT_ACCOUNTS,
      ]);
      expect(result).toBe(false);
    });
  });

  describe('getAllowedActions', () => {
    it('should return all actions for SUPER_ADMIN', () => {
      const actions = service.getAllowedActions(Role.SUPER_ADMIN);
      expect(actions).toContain(Action.CREATE_ACCOUNT);
      expect(actions).toContain(Action.DELETE_ACCOUNT);
      expect(actions).toContain(Action.VIEW_ALL_ACCOUNTS);
      expect(actions.length).toBeGreaterThan(20); // SUPER_ADMIN tiene muchos permisos
    });

    it('should return limited actions for ADMIN', () => {
      const actions = service.getAllowedActions(Role.ADMIN);
      expect(actions).toContain(Action.CREATE_ACCOUNT);
      expect(actions).toContain(Action.VIEW_CLIENT_ACCOUNTS);
      expect(actions).not.toContain(Action.DELETE_ACCOUNT);
    });

    it('should return minimal actions for MEMBER', () => {
      const actions = service.getAllowedActions(Role.MEMBER);
      expect(actions).not.toContain(Action.CREATE_ACCOUNT);
      expect(actions).not.toContain(Action.DELETE_ACCOUNT);
      expect(actions.length).toBeLessThan(5);
    });
  });
});
