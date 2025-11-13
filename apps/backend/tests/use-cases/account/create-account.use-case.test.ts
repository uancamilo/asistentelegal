import { Test, TestingModule } from '@nestjs/testing';
import { CreateAccountUseCase } from '../../../src/modules/account/application/use-cases/CreateAccount/CreateAccount.use-case';
import { ACCOUNT_REPOSITORY } from '../../../src/modules/account/domain/constants/tokens';
import { USER_REPOSITORY } from '../../../src/modules/user/domain/constants/tokens';
import { IAccountRepository } from '../../../src/modules/account/domain/interfaces/IAccountRepository';
import { IUserRepository } from '../../../src/modules/user/domain/interfaces/IUserRepository';
import { AccountEntity, AccountStatus } from '../../../src/modules/account/domain/entities/Account.entity';
import { UserEntity, Role, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { CreateAccountRequestDto } from '../../../src/modules/account/application/use-cases/CreateAccount/CreateAccount.dto';
import { ConflictException, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../src/shared/audit/audit.service';

describe('CreateAccountUseCase', () => {
  let useCase: CreateAccountUseCase;
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

  // Helper: Crear DTO de prueba
  const createTestDto = (): CreateAccountRequestDto => {
    const dto = new CreateAccountRequestDto();
    dto.name = 'Test Account';
    return dto;
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

    // Mock del repositorio de User
    const mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
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
        CreateAccountUseCase,
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

    useCase = module.get<CreateAccountUseCase>(CreateAccountUseCase);
    accountRepository = module.get(ACCOUNT_REPOSITORY);
    userRepository = module.get(USER_REPOSITORY);
  });

  describe('Authorization - Who can create accounts', () => {
    it('should allow SUPER_ADMIN to create account', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const ownerUser = createTestUser(Role.ACCOUNT_OWNER, 'owner-123');

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(ownerUser);
      accountRepository.create.mockResolvedValue(
        new AccountEntity('acc-123', dto.name, 'owner-123', 'admin-id', AccountStatus.ACTIVE, false, new Date(), new Date())
      );

      const result = await useCase.execute(dto, superAdmin);

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.isSystemAccount).toBe(false);
      expect(accountRepository.create).toHaveBeenCalled();
    });

    it('should allow ADMIN to create account', async () => {
      const admin = createTestUser(Role.ADMIN);
      const dto = createTestDto();
      const ownerUser = createTestUser(Role.ACCOUNT_OWNER, 'owner-123');

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(ownerUser);
      accountRepository.create.mockResolvedValue(
        new AccountEntity('acc-123', dto.name, 'owner-123', 'admin-id', AccountStatus.ACTIVE, false, new Date(), new Date())
      );

      const result = await useCase.execute(dto, admin);

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.isSystemAccount).toBe(false);
    });

    it('should reject EDITOR creating account', async () => {
      const editor = createTestUser(Role.EDITOR);
      const dto = createTestDto();

      await expect(useCase.execute(dto, editor)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(dto, editor)).rejects.toThrow(
        'Users with role EDITOR are not allowed to create accounts'
      );

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject ACCOUNT_OWNER creating account', async () => {
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER);
      const dto = createTestDto();

      await expect(useCase.execute(dto, accountOwner)).rejects.toThrow(ForbiddenException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject MEMBER creating account', async () => {
      const member = createTestUser(Role.MEMBER);
      const dto = createTestDto();

      await expect(useCase.execute(dto, member)).rejects.toThrow(ForbiddenException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Business Logic Validations', () => {
    it('should reject if account name already exists', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const existingAccount = new AccountEntity(
        'acc-existing',
        dto.name,
        'owner-999',
        'admin-id',
        AccountStatus.ACTIVE,
        false,
        new Date(),
        new Date()
      );

      accountRepository.findByName.mockResolvedValue(existingAccount);

      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(ConflictException);
      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(
        `Account with name "${dto.name}" already exists`
      );

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject if owner user does not exist', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(
        `User with id "${'owner-123'}" not found`
      );

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should reject if owner is not ACCOUNT_OWNER or MEMBER', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const invalidOwner = createTestUser(Role.ADMIN, 'owner-123');

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(invalidOwner);

      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(
        `User with id "${'owner-123'}" must have role ACCOUNT_OWNER or MEMBER to own an account`
      );

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('should trim account name', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = '  Test Account  ';
      const ownerUser = createTestUser(Role.ACCOUNT_OWNER, 'owner-123');

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(ownerUser);
      accountRepository.create.mockImplementation((account) => Promise.resolve(account));

      await useCase.execute(dto, superAdmin);

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Account',
        })
      );
    });

    it('should reject empty account name', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = '   ';

      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(
        'Account name cannot be empty'
      );

      expect(accountRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('System Account Protection', () => {
    it('should ALWAYS create accounts with isSystemAccount = false', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const ownerUser = createTestUser(Role.ACCOUNT_OWNER, 'owner-123');

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(ownerUser);
      accountRepository.create.mockImplementation((account) => Promise.resolve(account));

      await useCase.execute(dto, superAdmin);

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isSystemAccount: false,
        })
      );
    });

    it('should return isSystemAccount = false in response', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const ownerUser = createTestUser(Role.ACCOUNT_OWNER, 'owner-123');

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(ownerUser);
      accountRepository.create.mockResolvedValue(
        new AccountEntity('acc-123', dto.name, 'owner-123', 'admin-id', AccountStatus.ACTIVE, false, new Date(), new Date())
      );

      const result = await useCase.execute(dto, superAdmin);

      expect(result.isSystemAccount).toBe(false);
    });

    it('should prevent creating account with name "Employees"', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'Employees';

      // Simular que existe la cuenta Employees (cuenta del sistema)
      const employeesAccount = new AccountEntity(
        'emp-001',
        'Employees',
        'superadmin-id',
        'admin-id',
        AccountStatus.ACTIVE,
        true,
        new Date(),
        new Date()
      );
      accountRepository.findByName.mockResolvedValue(employeesAccount);

      await expect(useCase.execute(dto, superAdmin)).rejects.toThrow(ConflictException);

      expect(accountRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Successful Account Creation', () => {
    it('should create account and return complete response', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const ownerUser = createTestUser(Role.ACCOUNT_OWNER, 'owner-123');
      const now = new Date();
      const createdAccount = new AccountEntity('acc-123', dto.name, 'owner-123', 'admin-id', AccountStatus.ACTIVE, false, now, now);

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(ownerUser);
      accountRepository.create.mockResolvedValue(createdAccount);

      const result = await useCase.execute(dto, superAdmin);

      expect(result).toEqual({
        id: 'acc-123',
        name: dto.name,
        ownerId: 'owner-123',
        isSystemAccount: false,
        createdAt: now,
        updatedAt: now,
      });
    });

    it('should generate unique account ID', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const ownerUser = createTestUser(Role.ACCOUNT_OWNER, 'owner-123');

      accountRepository.findByName.mockResolvedValue(null);
      userRepository.findById.mockResolvedValue(ownerUser);
      accountRepository.create.mockImplementation((account) => Promise.resolve(account));

      await useCase.execute(dto, superAdmin);

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^acc_[a-f0-9]{24}$/),
        })
      );
    });
  });
});
