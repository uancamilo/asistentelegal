import { Test, TestingModule } from '@nestjs/testing';
import { GetAuditLogsUseCase } from '../../../src/shared/audit/application/use-cases/GetAuditLogs/GetAuditLogs.use-case';
import { AUDIT_LOG_REPOSITORY } from '../../../src/shared/audit/audit.service';
import { IAuditLogRepository } from '../../../src/shared/audit/repositories/IAuditLog.repository';
import { AuditLogEntity } from '../../../src/shared/audit/entities/AuditLog.entity';
import { UserEntity, Role, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { ForbiddenException } from '@nestjs/common';
import { AuditAction } from '../../../src/shared/audit/enums/AuditAction.enum';
import { AuditResource } from '../../../src/shared/audit/enums/AuditResource.enum';
import { GetAuditLogsRequestDto } from '../../../src/shared/audit/application/use-cases/GetAuditLogs/GetAuditLogs.dto';

describe('GetAuditLogsUseCase', () => {
  let useCase: GetAuditLogsUseCase;
  let auditLogRepository: jest.Mocked<IAuditLogRepository>;

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

  // Helper: Crear log de auditoría de prueba
  const createTestAuditLog = (
    id: string = 'log-123',
    userId: string = 'user-456',
    action: AuditAction = AuditAction.CREATE,
    resource: AuditResource = AuditResource.ACCOUNT
  ): AuditLogEntity => {
    return new AuditLogEntity(
      id,
      userId,
      'user@example.com',
      Role.ADMIN,
      action,
      resource,
      'resource-123',
      'Resource Name',
      { test: 'data' },
      '127.0.0.1',
      'Mozilla/5.0',
      true,
      null,
      new Date()
    );
  };

  // Helper: Crear DTO de request
  const createTestDto = (): GetAuditLogsRequestDto => {
    const dto = new GetAuditLogsRequestDto();
    return dto;
  };

  beforeEach(async () => {
    const mockAuditLogRepository = {
      create: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByResource: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAuditLogsUseCase,
        {
          provide: AUDIT_LOG_REPOSITORY,
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAuditLogsUseCase>(GetAuditLogsUseCase);
    auditLogRepository = module.get(AUDIT_LOG_REPOSITORY);
  });

  describe('Authorization', () => {
    it('should allow SUPER_ADMIN to access audit logs', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const logs = [createTestAuditLog()];

      auditLogRepository.find.mockResolvedValue(logs);
      auditLogRepository.count.mockResolvedValue(1);

      const result = await useCase.execute(dto, superAdmin);

      expect(result).toBeDefined();
      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should reject ADMIN from accessing audit logs', async () => {
      const admin = createTestUser(Role.ADMIN);
      const dto = createTestDto();

      await expect(useCase.execute(dto, admin)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(dto, admin)).rejects.toThrow(
        'Only SUPER_ADMIN can access audit logs'
      );

      expect(auditLogRepository.find).not.toHaveBeenCalled();
    });

    it('should reject ACCOUNT_OWNER from accessing audit logs', async () => {
      const accountOwner = createTestUser(Role.ACCOUNT_OWNER);
      const dto = createTestDto();

      await expect(useCase.execute(dto, accountOwner)).rejects.toThrow(ForbiddenException);
      expect(auditLogRepository.find).not.toHaveBeenCalled();
    });

    it('should reject EDITOR from accessing audit logs', async () => {
      const editor = createTestUser(Role.EDITOR);
      const dto = createTestDto();

      await expect(useCase.execute(dto, editor)).rejects.toThrow(ForbiddenException);
      expect(auditLogRepository.find).not.toHaveBeenCalled();
    });

    it('should reject MEMBER from accessing audit logs', async () => {
      const member = createTestUser(Role.MEMBER);
      const dto = createTestDto();

      await expect(useCase.execute(dto, member)).rejects.toThrow(ForbiddenException);
      expect(auditLogRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('Filtering', () => {
    it('should filter by userId', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.userId = 'user-456';
      const logs = [createTestAuditLog('log-1', 'user-456')];

      auditLogRepository.find.mockResolvedValue(logs);
      auditLogRepository.count.mockResolvedValue(1);

      const result = await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-456' })
      );
      expect(result.logs).toHaveLength(1);
    });

    it('should filter by action', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.action = AuditAction.DELETE;
      const logs = [createTestAuditLog('log-1', 'user-456', AuditAction.DELETE)];

      auditLogRepository.find.mockResolvedValue(logs);
      auditLogRepository.count.mockResolvedValue(1);

      const result = await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.DELETE })
      );
      expect(result.logs).toHaveLength(1);
    });

    it('should filter by resource', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.resource = AuditResource.USER;
      const logs = [createTestAuditLog('log-1', 'user-456', AuditAction.CREATE, AuditResource.USER)];

      auditLogRepository.find.mockResolvedValue(logs);
      auditLogRepository.count.mockResolvedValue(1);

      const result = await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ resource: AuditResource.USER })
      );
      expect(result.logs).toHaveLength(1);
    });

    it('should filter by resourceId', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.resourceId = 'account-123';

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'account-123' })
      );
    });

    it('should filter by success status', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.success = false;

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should filter by date range', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.startDate = '2025-01-01T00:00:00.000Z';
      dto.endDate = '2025-12-31T23:59:59.999Z';

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2025-01-01T00:00:00.000Z'),
          endDate: new Date('2025-12-31T23:59:59.999Z'),
        })
      );
    });
  });

  describe('Pagination', () => {
    it('should use default pagination (limit=100, offset=0)', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      const result = await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 0 })
      );
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
    });

    it('should respect custom pagination parameters', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.limit = 50;
      dto.offset = 25;

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      const result = await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 25 })
      );
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(25);
    });

    it('should respect maximum limit of 1000', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.limit = 1000;

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      const result = await useCase.execute(dto, superAdmin);

      expect(result.limit).toBe(1000);
    });
  });

  describe('Response structure', () => {
    it('should return correct response structure', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const now = new Date();
      const log = new AuditLogEntity(
        'log-123',
        'user-456',
        'user@example.com',
        Role.ADMIN,
        AuditAction.CREATE,
        AuditResource.ACCOUNT,
        'acc-123',
        'Test Account',
        { ownerId: 'owner-1' },
        '127.0.0.1',
        'Mozilla/5.0',
        true,
        null,
        now
      );

      auditLogRepository.find.mockResolvedValue([log]);
      auditLogRepository.count.mockResolvedValue(1);

      const result = await useCase.execute(dto, superAdmin);

      expect(result).toEqual({
        logs: [
          {
            id: 'log-123',
            userId: 'user-456',
            userEmail: 'user@example.com',
            userRole: Role.ADMIN,
            action: AuditAction.CREATE,
            resource: AuditResource.ACCOUNT,
            resourceId: 'acc-123',
            resourceName: 'Test Account',
            details: { ownerId: 'owner-1' },
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
            success: true,
            errorMessage: null,
            createdAt: now,
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      });
    });

    it('should return empty array when no logs found', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      const result = await useCase.execute(dto, superAdmin);

      expect(result.logs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return multiple logs correctly', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      const logs = [
        createTestAuditLog('log-1'),
        createTestAuditLog('log-2'),
        createTestAuditLog('log-3'),
      ];

      auditLogRepository.find.mockResolvedValue(logs);
      auditLogRepository.count.mockResolvedValue(3);

      const result = await useCase.execute(dto, superAdmin);

      expect(result.logs).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });

  describe('Repository interactions', () => {
    it('should call both find and count in parallel', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      await useCase.execute(dto, superAdmin);

      expect(auditLogRepository.find).toHaveBeenCalledTimes(1);
      expect(auditLogRepository.count).toHaveBeenCalledTimes(1);
    });

    it('should pass correct filters to count (without limit/offset)', async () => {
      const superAdmin = createTestUser(Role.SUPER_ADMIN);
      const dto = createTestDto();
      dto.userId = 'user-456';
      dto.action = AuditAction.CREATE;
      dto.limit = 50;
      dto.offset = 10;

      auditLogRepository.find.mockResolvedValue([]);
      auditLogRepository.count.mockResolvedValue(0);

      await useCase.execute(dto, superAdmin);

      // count should NOT receive limit/offset
      expect(auditLogRepository.count).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          action: AuditAction.CREATE,
        })
      );
      expect(auditLogRepository.count).toHaveBeenCalledWith(
        expect.not.objectContaining({
          limit: expect.anything(),
          offset: expect.anything(),
        })
      );
    });
  });
});
