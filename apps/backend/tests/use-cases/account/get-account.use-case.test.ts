import { Test, TestingModule } from '@nestjs/testing';
import { GetAccountUseCase } from '../../../src/modules/account/application/use-cases/GetAccount/GetAccount.use-case';
import { ACCOUNT_REPOSITORY } from '../../../src/modules/account/domain/constants/tokens';
import { IAccountRepository } from '../../../src/modules/account/domain/interfaces/IAccountRepository';
import { AccountEntity, AccountStatus } from '../../../src/modules/account/domain/entities/Account.entity';
import { UserEntity, Role, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../../../src/shared/audit/audit.service';

describe('GetAccountUseCase', () => {
  let useCase: GetAccountUseCase;
  let accountRepository: jest.Mocked<IAccountRepository>;

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
        GetAccountUseCase,
        {
          provide: ACCOUNT_REPOSITORY,
          useValue: mockAccountRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    useCase = module.get<GetAccountUseCase>(GetAccountUseCase);
    accountRepository = module.get(ACCOUNT_REPOSITORY);
  });

  describe('Account not found', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const nonExistentId = 'non-existent-id';

      accountRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(nonExistentId, superAdmin)).rejects.toThrow(
        NotFoundException
      );
      await expect(useCase.execute(nonExistentId, superAdmin)).rejects.toThrow(
        `Account with id "${nonExistentId}" not found`
      );
    });
  });

  describe('SUPER_ADMIN - Full access', () => {
    it('should allow SUPER_ADMIN to view any client account', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const account = createTestAccount('acc-1', 'Client Account', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', superAdmin);

      expect(result).toBeDefined();
      expect(result.id).toBe('acc-1');
      expect(result.name).toBe('Client Account');
    });

    it('should allow SUPER_ADMIN to view Employees account', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const employeesAccount = createTestAccount('emp-001', 'Employees', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(employeesAccount);

      const result = await useCase.execute('emp-001', superAdmin);

      expect(result).toBeDefined();
      expect(result.name).toBe('Employees');
      expect(result.isSystemAccount).toBe(true);
    });

    it('should allow SUPER_ADMIN to view any system account', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const systemAccount = createTestAccount('sys-1', 'System Account', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(systemAccount);

      const result = await useCase.execute('sys-1', superAdmin);

      expect(result).toBeDefined();
      expect(result.isSystemAccount).toBe(true);
    });
  });

  describe('ADMIN - Restricted access (NO system accounts)', () => {
    it('should allow ADMIN to view client accounts', async () => {
      const admin = createTestUser(Role.ADMIN);
      const account = createTestAccount('acc-1', 'Client Account', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', admin);

      expect(result).toBeDefined();
      expect(result.id).toBe('acc-1');
    });

    it('should reject ADMIN viewing Employees account', async () => {
      const admin = createTestUser(Role.ADMIN);
      const employeesAccount = createTestAccount('emp-001', 'Employees', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(employeesAccount);

      await expect(useCase.execute('emp-001', admin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute('emp-001', admin)).rejects.toThrow(
        'Access denied. ADMIN users cannot access system accounts'
      );
    });

    it('should reject ADMIN viewing any system account', async () => {
      const admin = createTestUser(Role.ADMIN);
      const systemAccount = createTestAccount('sys-1', 'System Account', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(systemAccount);

      await expect(useCase.execute('sys-1', admin)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ACCOUNT_OWNER - Own account only', () => {
    it('should allow ACCOUNT_OWNER to view their own account', async () => {
      const ownerId = 'owner-123';
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER, ownerId);
      const ownAccount = createTestAccount('acc-1', 'My Account', ownerId, false);

      accountRepository.findById.mockResolvedValue(ownAccount);

      const result = await useCase.execute('acc-1', accountOwner);

      expect(result).toBeDefined();
      expect(result.id).toBe('acc-1');
      expect(result.ownerId).toBe(ownerId);
    });

    it('should reject ACCOUNT_OWNER viewing another account', async () => {
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER, 'owner-1');
      const otherAccount = createTestAccount('acc-2', 'Other Account', 'owner-2', false);

      accountRepository.findById.mockResolvedValue(otherAccount);

      await expect(useCase.execute('acc-2', accountOwner)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute('acc-2', accountOwner)).rejects.toThrow(
        'Access denied. You can only access your own account'
      );
    });

    it('should reject ACCOUNT_OWNER viewing system account', async () => {
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER, 'owner-1');
      const systemAccount = createTestAccount('sys-1', 'System Account', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(systemAccount);

      await expect(useCase.execute('sys-1', accountOwner)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('MEMBER - No access', () => {
    it('should reject MEMBER viewing any account', async () => {
      const member = createTestUser(Role.MEMBER);
      const account = createTestAccount('acc-1', 'Some Account', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);

      await expect(useCase.execute('acc-1', member)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute('acc-1', member)).rejects.toThrow(
        'Users with role MEMBER are not allowed to view account details'
      );
    });
  });

  describe('EDITOR - No access', () => {
    it('should reject EDITOR viewing any account', async () => {
      const editor = createTestUser(Role.EDITOR);
      const account = createTestAccount('acc-1', 'Some Account', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);

      await expect(useCase.execute('acc-1', editor)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute('acc-1', editor)).rejects.toThrow(
        'Users with role EDITOR are not allowed to view account details'
      );
    });
  });

  describe('Response structure', () => {
    it('should return complete account details', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const now = new Date();
      const account = new AccountEntity('acc-1', 'Test Account', 'owner-123', 'admin-id', AccountStatus.ACTIVE, false, now, now);

      accountRepository.findById.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', superAdmin);

      expect(result).toEqual({
        id: 'acc-1',
        name: 'Test Account',
        ownerId: 'owner-123',
        isSystemAccount: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    it('should include isSystemAccount field', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const account = createTestAccount('emp-001', 'Employees', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(account);

      const result = await useCase.execute('emp-001', superAdmin);

      expect(result).toHaveProperty('isSystemAccount');
      expect(result.isSystemAccount).toBe(true);
    });
  });
});
