import { Test, TestingModule } from '@nestjs/testing';
import { ListAccountsUseCase } from '../../../src/modules/account/application/use-cases/ListAccounts/ListAccounts.use-case';
import { ACCOUNT_REPOSITORY } from '../../../src/modules/account/domain/constants/tokens';
import { IAccountRepository } from '../../../src/modules/account/domain/interfaces/IAccountRepository';
import { AccountEntity, AccountStatus } from '../../../src/modules/account/domain/entities/Account.entity';
import { UserEntity, Role, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { ForbiddenException } from '@nestjs/common';
import { AuditService } from '../../../src/shared/audit/audit.service';

describe('ListAccountsUseCase', () => {
  let useCase: ListAccountsUseCase;
  let accountRepository: jest.Mocked<IAccountRepository>;

  // Helper: Crear usuario de prueba
  const createTestUser = (role: Role): UserEntity => {
    return new UserEntity(
      'user-123',
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
    isSystemAccount: boolean = false
  ): AccountEntity => {
    return new AccountEntity(id, name, 'owner-123', 'admin-id', AccountStatus.ACTIVE, isSystemAccount, new Date(), new Date());
  };

  beforeEach(async () => {
    // Mock del repositorio de Account
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
        ListAccountsUseCase,
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

    useCase = module.get<ListAccountsUseCase>(ListAccountsUseCase);
    accountRepository = module.get(ACCOUNT_REPOSITORY);
  });

  describe('Authorization - Who can list accounts', () => {
    it('should allow SUPER_ADMIN to list accounts', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const accounts = [createTestAccount('acc-1', 'Account 1')];

      accountRepository.findAll.mockResolvedValue(accounts);

      const result = await useCase.execute(superAdmin);

      expect(result).toBeDefined();
      expect(result.accounts).toHaveLength(1);
      expect(accountRepository.findAll).toHaveBeenCalled();
    });

    it('should allow ADMIN to list accounts', async () => {
      const admin = createTestUser(Role.ADMIN);
      const accounts = [createTestAccount('acc-1', 'Account 1')];

      accountRepository.findAll.mockResolvedValue(accounts);

      const result = await useCase.execute(admin);

      expect(result).toBeDefined();
      expect(result.accounts).toHaveLength(1);
      expect(accountRepository.findAll).toHaveBeenCalled();
    });

    it('should reject EDITOR listing accounts', async () => {
      const editor = createTestUser(Role.EDITOR);

      await expect(useCase.execute(editor)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(editor)).rejects.toThrow(
        'Users with role EDITOR are not allowed to list accounts'
      );

      expect(accountRepository.findAll).not.toHaveBeenCalled();
    });

    it('should reject ACCOUNT_OWNER listing accounts', async () => {
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER);

      await expect(useCase.execute(accountOwner)).rejects.toThrow(ForbiddenException);

      expect(accountRepository.findAll).not.toHaveBeenCalled();
    });

    it('should reject MEMBER listing accounts', async () => {
      const member = createTestUser(Role.MEMBER);

      await expect(useCase.execute(member)).rejects.toThrow(ForbiddenException);

      expect(accountRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('SUPER_ADMIN - Full access', () => {
    it('should return ALL accounts including system accounts', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const accounts = [
        createTestAccount('emp-001', 'Employees', true), // Sistema
        createTestAccount('acc-1', 'Client 1', false),
        createTestAccount('acc-2', 'Client 2', false),
      ];

      accountRepository.findAll.mockResolvedValue(accounts);

      const result = await useCase.execute(superAdmin);

      expect(result.accounts).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.accounts[0]?.name).toBe('Employees');
      expect(result.accounts[0]?.isSystemAccount).toBe(true);
    });

    it('should return Employees account when it exists', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const employeesAccount = createTestAccount('emp-001', 'Employees', true);
      const clientAccount = createTestAccount('acc-1', 'Client Corp', false);

      accountRepository.findAll.mockResolvedValue([employeesAccount, clientAccount]);

      const result = await useCase.execute(superAdmin);

      const employeesInResult = result.accounts.find((acc) => acc.name === 'Employees');
      expect(employeesInResult).toBeDefined();
      expect(employeesInResult?.isSystemAccount).toBe(true);
    });

    it('should return empty array if no accounts exist', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);

      accountRepository.findAll.mockResolvedValue([]);

      const result = await useCase.execute(superAdmin);

      expect(result.accounts).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('ADMIN - Filtered access (NO system accounts)', () => {
    it('should return only client accounts (isSystemAccount = false)', async () => {
      const admin = createTestUser(Role.ADMIN);
      const accounts = [
        createTestAccount('emp-001', 'Employees', true), // Debe ser filtrada
        createTestAccount('acc-1', 'Client 1', false),
        createTestAccount('acc-2', 'Client 2', false),
      ];

      accountRepository.findAll.mockResolvedValue(accounts);

      const result = await useCase.execute(admin);

      expect(result.accounts).toHaveLength(2); // Solo 2 cuentas de clientes
      expect(result.total).toBe(2);
      expect(result.accounts.every((acc) => !acc.isSystemAccount)).toBe(true);
    });

    it('should NOT return Employees account', async () => {
      const admin = createTestUser(Role.ADMIN);
      const employeesAccount = createTestAccount('emp-001', 'Employees', true);
      const clientAccount = createTestAccount('acc-1', 'Client Corp', false);

      accountRepository.findAll.mockResolvedValue([employeesAccount, clientAccount]);

      const result = await useCase.execute(admin);

      const employeesInResult = result.accounts.find((acc) => acc.name === 'Employees');
      expect(employeesInResult).toBeUndefined();
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]?.name).toBe('Client Corp');
    });

    it('should filter multiple system accounts', async () => {
      const admin = createTestUser(Role.ADMIN);
      const accounts = [
        createTestAccount('sys-1', 'System Account 1', true),
        createTestAccount('sys-2', 'System Account 2', true),
        createTestAccount('acc-1', 'Client 1', false),
      ];

      accountRepository.findAll.mockResolvedValue(accounts);

      const result = await useCase.execute(admin);

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]?.name).toBe('Client 1');
    });

    it('should return empty array if only system accounts exist', async () => {
      const admin = createTestUser(Role.ADMIN);
      const systemAccounts = [
        createTestAccount('emp-001', 'Employees', true),
        createTestAccount('sys-1', 'System Account', true),
      ];

      accountRepository.findAll.mockResolvedValue(systemAccounts);

      const result = await useCase.execute(admin);

      expect(result.accounts).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return all client accounts when no system accounts exist', async () => {
      const admin = createTestUser(Role.ADMIN);
      const clientAccounts = [
        createTestAccount('acc-1', 'Client 1', false),
        createTestAccount('acc-2', 'Client 2', false),
        createTestAccount('acc-3', 'Client 3', false),
      ];

      accountRepository.findAll.mockResolvedValue(clientAccounts);

      const result = await useCase.execute(admin);

      expect(result.accounts).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });

  describe('Response structure', () => {
    it('should return correct DTO structure', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const now = new Date();
      const account = new AccountEntity('acc-1', 'Test Account', 'owner-123', 'admin-id', AccountStatus.ACTIVE, false, now, now);

      accountRepository.findAll.mockResolvedValue([account]);

      const result = await useCase.execute(superAdmin);

      expect(result).toEqual({
        accounts: [
          {
            id: 'acc-1',
            name: 'Test Account',
            ownerId: 'owner-123',
            isSystemAccount: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
        total: 1,
      });
    });

    it('should include isSystemAccount field in each account', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const accounts = [
        createTestAccount('emp-001', 'Employees', true),
        createTestAccount('acc-1', 'Client', false),
      ];

      accountRepository.findAll.mockResolvedValue(accounts);

      const result = await useCase.execute(superAdmin);

      result.accounts.forEach((account) => {
        expect(account).toHaveProperty('isSystemAccount');
        expect(typeof account.isSystemAccount).toBe('boolean');
      });
    });
  });
});
