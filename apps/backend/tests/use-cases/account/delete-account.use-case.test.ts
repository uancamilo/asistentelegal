import { Test, TestingModule } from '@nestjs/testing';
import { DeleteAccountUseCase } from '../../../src/modules/account/application/use-cases/DeleteAccount/DeleteAccount.use-case';
import { ACCOUNT_REPOSITORY } from '../../../src/modules/account/domain/constants/tokens';
import { USER_REPOSITORY } from '../../../src/modules/user/domain/constants/tokens';
import { IAccountRepository } from '../../../src/modules/account/domain/interfaces/IAccountRepository';
import { IUserRepository } from '../../../src/modules/user/domain/interfaces/IUserRepository';
import { AccountEntity, AccountStatus } from '../../../src/modules/account/domain/entities/Account.entity';
import { UserEntity, Role, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../../../src/shared/audit/audit.service';

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase;
  let accountRepository: jest.Mocked<IAccountRepository>;
  let userRepository: jest.Mocked<IUserRepository>;

  // Helper: Crear usuario de prueba
  const createTestUser = (role: Role, id: string = 'user-123'): UserEntity => {
    return new UserEntity(
      id,
      Email.create('test@example.com'),
      'hashedPassword',
      'Test',
      'User',
      role,
      UserStatus.ACTIVE,
      null,
      new Date(),
      new Date(),
      0
    );
  };

  // Helper: Crear cuenta de prueba
  const createTestAccount = (
    id: string,
    name: string,
    ownerId: string,
    isSystemAccount: boolean = false
  ): AccountEntity => {
    return new AccountEntity(
      id,
      name,
      ownerId,
      'admin-id',
      AccountStatus.ACTIVE,
      isSystemAccount,
      new Date(),
      new Date()
    );
  };

  beforeEach(async () => {
    const mockAccountRepository = {
      findByName: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      existsByName: jest.fn(),
      findByOwnerId: jest.fn(),
    };

    const mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByRole: jest.fn(),
      findByAccountId: jest.fn(),
      findByStatus: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByRole: jest.fn(),
      existsByEmail: jest.fn(),
    };

    // Mock del servicio de auditoría
    const mockAuditService = {
      log: jest.fn(),
      logAccessDenied: jest.fn(),
      logError: jest.fn(),
      getAuditLogs: jest.fn(),
      getUserLogs: jest.fn(),
      getResourceLogs: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteAccountUseCase,
        {
          provide: ACCOUNT_REPOSITORY,
          useValue: mockAccountRepository,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    useCase = module.get<DeleteAccountUseCase>(DeleteAccountUseCase);
    accountRepository = module.get(ACCOUNT_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
  });

  describe('Account not found', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);

      accountRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent-id', superAdmin)).rejects.toThrow(
        NotFoundException
      );
      await expect(useCase.execute('non-existent-id', superAdmin)).rejects.toThrow(
        'Account not found'
      );
    });
  });

  describe('Authorization - SUPER_ADMIN', () => {
    it('should allow SUPER_ADMIN to delete account without users', async () => {
      const accountId = 'account-123';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN, 'super-admin-id');
      const account = createTestAccount(accountId, 'Test Account', ownerId, false);

      accountRepository.findById.mockResolvedValue(account);
      userRepository.findByAccountId.mockResolvedValue([]); // No users in account
      accountRepository.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, superAdmin);

      expect(result.message).toBe('Account deleted successfully');
      expect(result.id).toBe(accountId);
      expect(accountRepository.delete).toHaveBeenCalledWith(accountId);
    });

    it('should throw ForbiddenException if SUPER_ADMIN tries to delete Employees account', async () => {
      const accountId = 'employees-account-id';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const employeesAccount = createTestAccount(accountId, 'Employees', ownerId, true);

      accountRepository.findById.mockResolvedValue(employeesAccount);

      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(
        'Cannot delete system account'
      );
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Authorization - ADMIN', () => {
    it('should reject ADMIN from deleting any account', async () => {
      const accountId = 'account-123';
      const admin = createTestUser(Role.ADMIN);

      await expect(useCase.execute(accountId, admin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, admin)).rejects.toThrow(
        'Only SUPER_ADMIN can delete accounts'
      );
      expect(accountRepository.findById).not.toHaveBeenCalled();
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Authorization - ACCOUNT_OWNER', () => {
    it('should reject ACCOUNT_OWNER from deleting accounts', async () => {
      const accountId = 'account-123';
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER);

      await expect(useCase.execute(accountId, accountOwner)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, accountOwner)).rejects.toThrow(
        'Only SUPER_ADMIN can delete accounts'
      );
      expect(accountRepository.findById).not.toHaveBeenCalled();
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Authorization - EDITOR', () => {
    it('should reject EDITOR from deleting accounts', async () => {
      const accountId = 'account-123';
      const editor = createTestUser(Role.EDITOR);

      await expect(useCase.execute(accountId, editor)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, editor)).rejects.toThrow(
        'Only SUPER_ADMIN can delete accounts'
      );
      expect(accountRepository.findById).not.toHaveBeenCalled();
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Authorization - MEMBER', () => {
    it('should reject MEMBER from deleting accounts', async () => {
      const accountId = 'account-123';
      const member = createTestUser(Role.MEMBER);

      await expect(useCase.execute(accountId, member)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, member)).rejects.toThrow(
        'Only SUPER_ADMIN can delete accounts'
      );
      expect(accountRepository.findById).not.toHaveBeenCalled();
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('System Account Protection', () => {
    it('should prevent deleting system accounts', async () => {
      const accountId = 'system-account-id';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const systemAccount = createTestAccount(accountId, 'System Account', ownerId, true);

      accountRepository.findById.mockResolvedValue(systemAccount);

      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(
        'Cannot delete system account'
      );
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });

    it('should prevent deleting Employees account specifically', async () => {
      const accountId = 'employees-id';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const employeesAccount = createTestAccount(accountId, 'Employees', ownerId, true);

      accountRepository.findById.mockResolvedValue(employeesAccount);

      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(
        'Cannot delete system account'
      );
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Business Logic - Active Users', () => {
    it('should prevent deleting account with 1 active user', async () => {
      const accountId = 'account-123';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const account = createTestAccount(accountId, 'Test Account', ownerId, false);
      const activeUser = createTestUser(Role.MEMBER, 'user-456');

      accountRepository.findById.mockResolvedValue(account);
      userRepository.findByAccountId.mockResolvedValue([activeUser]);

      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(
        'Cannot delete account with 1 active user(s)'
      );
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });

    it('should prevent deleting account with multiple active users', async () => {
      const accountId = 'account-123';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const account = createTestAccount(accountId, 'Test Account', ownerId, false);
      const user1 = createTestUser(Role.MEMBER, 'user-1');
      const user2 = createTestUser(Role.EDITOR, 'user-2');
      const user3 = createTestUser(Role.MEMBER, 'user-3');

      accountRepository.findById.mockResolvedValue(account);
      userRepository.findByAccountId.mockResolvedValue([user1, user2, user3]);

      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(accountId, superAdmin)).rejects.toThrow(
        'Cannot delete account with 3 active user(s)'
      );
      expect(accountRepository.delete).not.toHaveBeenCalled();
    });

    it('should allow deleting account with no active users', async () => {
      const accountId = 'account-123';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const account = createTestAccount(accountId, 'Test Account', ownerId, false);

      accountRepository.findById.mockResolvedValue(account);
      userRepository.findByAccountId.mockResolvedValue([]); // No users
      accountRepository.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, superAdmin);

      expect(result.message).toBe('Account deleted successfully');
      expect(result.id).toBe(accountId);
      expect(accountRepository.delete).toHaveBeenCalledWith(accountId);
    });
  });

  describe('Success cases', () => {
    it('should successfully delete account and return confirmation', async () => {
      const accountId = 'account-to-delete';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const account = createTestAccount(accountId, 'Account To Delete', ownerId, false);

      accountRepository.findById.mockResolvedValue(account);
      userRepository.findByAccountId.mockResolvedValue([]);
      accountRepository.delete.mockResolvedValue(undefined);

      const result = await useCase.execute(accountId, superAdmin);

      expect(result).toEqual({
        message: 'Account deleted successfully',
        id: accountId,
      });
      expect(accountRepository.findById).toHaveBeenCalledWith(accountId);
      expect(userRepository.findByAccountId).toHaveBeenCalledWith(accountId);
      expect(accountRepository.delete).toHaveBeenCalledWith(accountId);
    });

    it('should call delete method exactly once', async () => {
      const accountId = 'account-123';
      const ownerId = 'owner-123';
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const account = createTestAccount(accountId, 'Test Account', ownerId, false);

      accountRepository.findById.mockResolvedValue(account);
      userRepository.findByAccountId.mockResolvedValue([]);
      accountRepository.delete.mockResolvedValue(undefined);

      await useCase.execute(accountId, superAdmin);

      expect(accountRepository.delete).toHaveBeenCalledTimes(1);
      expect(accountRepository.delete).toHaveBeenCalledWith(accountId);
    });
  });
});
