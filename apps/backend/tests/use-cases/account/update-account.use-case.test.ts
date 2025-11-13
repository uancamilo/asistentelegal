import { Test, TestingModule } from '@nestjs/testing';
import { UpdateAccountUseCase } from '../../../src/modules/account/application/use-cases/UpdateAccount/UpdateAccount.use-case';
import { ACCOUNT_REPOSITORY } from '../../../src/modules/account/domain/constants/tokens';
import { IAccountRepository } from '../../../src/modules/account/domain/interfaces/IAccountRepository';
import { AccountEntity, AccountStatus } from '../../../src/modules/account/domain/entities/Account.entity';
import { UserEntity, Role, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { UpdateAccountRequestDto } from '../../../src/modules/account/application/use-cases/UpdateAccount/UpdateAccount.dto';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AuditService } from '../../../src/shared/audit/audit.service';

describe('UpdateAccountUseCase', () => {
  let useCase: UpdateAccountUseCase;
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
    return new AccountEntity(id, name, ownerId, 'admin-id', AccountStatus.ACTIVE, isSystemAccount, new Date(), new Date());
  };

  // Helper: Crear DTO de prueba
  const createTestDto = (): UpdateAccountRequestDto => {
    const dto = new UpdateAccountRequestDto();
    dto.name = 'Updated Account Name';
    return dto;
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
        UpdateAccountUseCase,
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

    useCase = module.get<UpdateAccountUseCase>(UpdateAccountUseCase);
    accountRepository = module.get(ACCOUNT_REPOSITORY);
  });

  describe('Account not found', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();

      accountRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent-id', dto, superAdmin)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('Authorization - SUPER_ADMIN', () => {
    it('should allow SUPER_ADMIN to update any client account', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const account = createTestAccount('acc-1', 'Old Name', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.findByName.mockResolvedValue(null);
      accountRepository.update.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', dto, superAdmin);

      expect(result).toBeDefined();
      expect(accountRepository.update).toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN to update Employees account name', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'Internal Staff'; // Intentar renombrar
      const employeesAccount = createTestAccount('emp-001', 'Employees', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(employeesAccount);
      accountRepository.findByName.mockResolvedValue(null);

      // Debe rechazarse porque isSystemAccount = true (validación del dominio)
      await expect(useCase.execute('emp-001', dto, superAdmin)).rejects.toThrow(
        ForbiddenException
      );
      await expect(useCase.execute('emp-001', dto, superAdmin)).rejects.toThrow(
        'System accounts cannot be renamed'
      );
    });
  });

  describe('Authorization - ADMIN', () => {
    it('should allow ADMIN to update client accounts', async () => {
      const admin = createTestUser(Role.ADMIN);
      const dto = createTestDto();
      const account = createTestAccount('acc-1', 'Old Name', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.findByName.mockResolvedValue(null);
      accountRepository.update.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', dto, admin);

      expect(result).toBeDefined();
    });

    it('should reject ADMIN updating Employees account', async () => {
      const admin = createTestUser(Role.ADMIN);
      const dto = createTestDto();
      const employeesAccount = createTestAccount('emp-001', 'Employees', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(employeesAccount);

      await expect(useCase.execute('emp-001', dto, admin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute('emp-001', dto, admin)).rejects.toThrow(
        'You do not have permission to edit this account'
      );
    });

    it('should reject ADMIN updating any system account', async () => {
      const admin = createTestUser(Role.ADMIN);
      const dto = createTestDto();
      const systemAccount = createTestAccount('sys-1', 'System Account', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(systemAccount);

      await expect(useCase.execute('sys-1', dto, admin)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Authorization - ACCOUNT_OWNER', () => {
    it('should allow ACCOUNT_OWNER to update their own account', async () => {
      const ownerId = 'owner-123';
      const accountId = 'acc-1';
      // ACCOUNT_OWNER debe tener accountId establecido
      const accountOwner = new UserEntity(
        ownerId,
        Email.create('owner@example.com'),
        'hashedPassword',
        'Owner',
        'User',
        Role.ACCOUNT_OWNER,
        UserStatus.ACTIVE,
        accountId, // Este es el accountId de la cuenta
        new Date(),
        new Date(),
        0
      );
      const dto = createTestDto();
      const ownAccount = createTestAccount(accountId, 'Old Name', ownerId, false);

      accountRepository.findById.mockResolvedValue(ownAccount);
      accountRepository.findByName.mockResolvedValue(null);
      accountRepository.update.mockResolvedValue(ownAccount);

      const result = await useCase.execute(accountId, dto, accountOwner);

      expect(result).toBeDefined();
    });

    it('should reject ACCOUNT_OWNER updating another account', async () => {
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER, 'owner-1');
      const dto = createTestDto();
      const otherAccount = createTestAccount('acc-2', 'Other Account', 'owner-2', false);

      accountRepository.findById.mockResolvedValue(otherAccount);

      await expect(useCase.execute('acc-2', dto, accountOwner)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('Authorization - MEMBER and EDITOR', () => {
    it('should reject MEMBER updating any account', async () => {
      const member = createTestUser(Role.MEMBER);
      const dto = createTestDto();
      const account = createTestAccount('acc-1', 'Account', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);

      await expect(useCase.execute('acc-1', dto, member)).rejects.toThrow(ForbiddenException);
    });

    it('should reject EDITOR updating any account', async () => {
      const editor = createTestUser(Role.EDITOR);
      const dto = createTestDto();
      const account = createTestAccount('acc-1', 'Account', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);

      await expect(useCase.execute('acc-1', dto, editor)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Business Logic - Name updates', () => {
    it('should update account name successfully', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'New Account Name';
      const account = createTestAccount('acc-1', 'Old Name', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.findByName.mockResolvedValue(null);
      accountRepository.update.mockResolvedValue(account);

      await useCase.execute('acc-1', dto, superAdmin);

      expect(account.name).toBe('New Account Name');
      expect(accountRepository.update).toHaveBeenCalled();
    });

    it('should reject if new name already exists (different account)', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'Existing Name';
      const account = createTestAccount('acc-1', 'Old Name', 'owner-1', false);
      const existingAccount = createTestAccount('acc-2', 'Existing Name', 'owner-2', false);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.findByName.mockResolvedValue(existingAccount);

      await expect(useCase.execute('acc-1', dto, superAdmin)).rejects.toThrow(ConflictException);
      await expect(useCase.execute('acc-1', dto, superAdmin)).rejects.toThrow(
        'Account with name "Existing Name" already exists'
      );
    });

    it('should allow updating to same name (no change)', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'Same Name';
      const account = createTestAccount('acc-1', 'Same Name', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.update.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', dto, superAdmin);

      expect(result).toBeDefined();
      // No debe buscar duplicados si el nombre no cambia
      expect(accountRepository.findByName).not.toHaveBeenCalled();
    });

    it('should trim whitespace from new name', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = '  Trimmed Name  ';
      const account = createTestAccount('acc-1', 'Old Name', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.findByName.mockResolvedValue(null);
      accountRepository.update.mockResolvedValue(account);

      await useCase.execute('acc-1', dto, superAdmin);

      expect(account.name).toBe('Trimmed Name');
    });
  });

  describe('System Account Protection', () => {
    it('should prevent renaming system accounts', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'New System Name';
      const systemAccount = createTestAccount('sys-1', 'System Account', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(systemAccount);
      accountRepository.findByName.mockResolvedValue(null);

      await expect(useCase.execute('sys-1', dto, superAdmin)).rejects.toThrow(
        ForbiddenException
      );
      await expect(useCase.execute('sys-1', dto, superAdmin)).rejects.toThrow(
        'System accounts cannot be renamed'
      );
    });

    it('should prevent renaming Employees account', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'Staff';
      const employeesAccount = createTestAccount('emp-001', 'Employees', 'admin-1', true);

      accountRepository.findById.mockResolvedValue(employeesAccount);
      accountRepository.findByName.mockResolvedValue(null);

      await expect(useCase.execute('emp-001', dto, superAdmin)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('Response structure', () => {
    it('should return complete updated account details', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.name = 'Updated Name';
      const now = new Date();
      const account = new AccountEntity('acc-1', 'Old Name', 'owner-1', 'admin-id', AccountStatus.ACTIVE, false, now, now);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.findByName.mockResolvedValue(null);
      accountRepository.update.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', dto, superAdmin);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('ownerId');
      expect(result).toHaveProperty('isSystemAccount');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should preserve isSystemAccount value (cannot be changed)', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const account = createTestAccount('acc-1', 'Old Name', 'owner-1', false);

      accountRepository.findById.mockResolvedValue(account);
      accountRepository.findByName.mockResolvedValue(null);
      accountRepository.update.mockResolvedValue(account);

      const result = await useCase.execute('acc-1', dto, superAdmin);

      expect(result.isSystemAccount).toBe(false);
    });
  });
});
