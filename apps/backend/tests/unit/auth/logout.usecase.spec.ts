import { LogoutUseCase } from '../../../src/modules/auth/application/use-cases/Logout.usecase';
import { IUserRepository } from '../../../src/modules/user/domain/interfaces/IUserRepository';
import { PrismaService } from '../../../src/database/prisma.service';
import { CacheService } from '../../../src/shared/cache/cache.service';
import { UserEntity, UserStatus, Role } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { AuditAction } from '../../../src/shared/audit/enums/AuditAction.enum';

describe('LogoutUseCase', () => {
  let logoutUseCase: LogoutUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    // Create mocks
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findByAccountId: jest.fn(),
      findByRole: jest.fn(),
      findByStatus: jest.fn(),
      findClientUsers: jest.fn(),
      countByRole: jest.fn(),
      countClientUsers: jest.fn(),
      existsByEmail: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockPrismaService = {
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    mockCacheService = {
      invalidateUser: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    logoutUseCase = new LogoutUseCase(
      mockUserRepository,
      mockPrismaService,
      mockCacheService
    );
  });

  describe('Successful Logout', () => {
    it('should successfully logout and invalidate all tokens', async () => {
      // Arrange
      const userId = 'user123';
      const mockUser = new UserEntity(
        userId,
        Email.create('test@example.com'),
        'hashedPassword',
        'Test',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        7 // Current tokenVersion
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const mockUpdateUser = jest.fn().mockResolvedValue({});
      const mockCreateAuditLog = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: mockUpdateUser },
          auditLog: { create: mockCreateAuditLog },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);

      // Act
      const result = await logoutUseCase.execute(userId);

      // Assert
      expect(result).toEqual({ message: 'Logout successful' });

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);

      // Verify tokenVersion was incremented to invalidate all tokens
      expect(mockUpdateUser).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          tokenVersion: 8, // Incremented from 7 to 8
          updatedAt: expect.any(Date),
        },
      });

      // Verify audit log was created
      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: userId,
          userEmail: 'test@example.com',
          userRole: Role.MEMBER,
          action: AuditAction.LOGOUT,
          details: { tokenVersion: 8 },
          success: true,
        }),
      });

      // Verify cache was invalidated
      expect(mockCacheService.invalidateUser).toHaveBeenCalledWith(userId);
    });

    it('should increment tokenVersion to invalidate all existing tokens', async () => {
      // Arrange
      const userId = 'user456';
      const mockUser = new UserEntity(
        userId,
        Email.create('admin@example.com'),
        'hashedPassword',
        'Admin',
        'User',
        Role.ADMIN,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        15 // High tokenVersion - user has logged in many times
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const mockUpdateUser = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: mockUpdateUser },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);

      // Act
      await logoutUseCase.execute(userId);

      // Assert - Verify tokenVersion incremented from 15 to 16
      expect(mockUpdateUser).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          tokenVersion: 16,
        }),
      });
    });

    it('should invalidate user cache after logout', async () => {
      // Arrange
      const userId = 'user789';
      const mockUser = new UserEntity(
        userId,
        Email.create('member@example.com'),
        'hashedPassword',
        'Member',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        3
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: jest.fn().mockResolvedValue({}) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);

      // Act
      await logoutUseCase.execute(userId);

      // Assert - Cache invalidation must occur after token invalidation
      expect(mockCacheService.invalidateUser).toHaveBeenCalledWith(userId);
    });

    it('should use atomic transaction for token invalidation and audit logging', async () => {
      // Arrange
      const userId = 'user999';
      const mockUser = new UserEntity(
        userId,
        Email.create('test@example.com'),
        'hashedPassword',
        'Test',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        5
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const mockUpdateUser = jest.fn().mockResolvedValue({});
      const mockCreateAuditLog = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: mockUpdateUser },
          auditLog: { create: mockCreateAuditLog },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);

      // Act
      await logoutUseCase.execute(userId);

      // Assert - Both operations must be in the same transaction
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockCreateAuditLog).toHaveBeenCalled();
    });
  });

  describe('Logout for Non-Existent User', () => {
    it('should return success for non-existent user (security best practice)', async () => {
      // Arrange
      const nonExistentUserId = 'nonexistent-user';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      const result = await logoutUseCase.execute(nonExistentUserId);

      // Assert - Return success to avoid revealing user existence
      expect(result).toEqual({ message: 'Logout successful' });

      // Verify no database transaction was initiated
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();

      // Verify no cache invalidation occurred
      expect(mockCacheService.invalidateUser).not.toHaveBeenCalled();
    });

    it('should not reveal user existence through different error messages', async () => {
      // Arrange
      const userId1 = 'user-exists';
      const userId2 = 'user-not-exists';

      const mockUser = new UserEntity(
        userId1,
        Email.create('exists@example.com'),
        'hashedPassword',
        'Existing',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        1
      );

      // First call: existing user
      mockUserRepository.findById.mockResolvedValueOnce(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: jest.fn().mockResolvedValue({}) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        });
      });
      mockCacheService.invalidateUser.mockResolvedValue(undefined);

      // Second call: non-existent user
      mockUserRepository.findById.mockResolvedValueOnce(null);

      // Act
      const result1 = await logoutUseCase.execute(userId1);
      const result2 = await logoutUseCase.execute(userId2);

      // Assert - Both return identical success messages
      expect(result1).toEqual({ message: 'Logout successful' });
      expect(result2).toEqual({ message: 'Logout successful' });
    });
  });

  describe('Token Invalidation Behavior', () => {
    it('should invalidate all access and refresh tokens by incrementing tokenVersion', async () => {
      // Arrange
      const userId = 'user-multi-device';
      const mockUser = new UserEntity(
        userId,
        Email.create('multidevice@example.com'),
        'hashedPassword',
        'Multi',
        'Device',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        10 // User has multiple active sessions
      );

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const mockUpdateUser = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: mockUpdateUser },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);

      // Act
      await logoutUseCase.execute(userId);

      // Assert - All tokens with tokenVersion <= 10 are now invalid
      // Only tokens with tokenVersion 11 (issued after this logout) will be valid
      expect(mockUpdateUser).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          tokenVersion: 11,
        }),
      });
    });
  });
});
