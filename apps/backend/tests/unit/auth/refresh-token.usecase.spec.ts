import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenUseCase } from '../../../src/modules/auth/application/use-cases/RefreshToken.usecase';
import { IUserRepository } from '../../../src/modules/user/domain/interfaces/IUserRepository';
import { JwtService } from '../../../src/modules/auth/infrastructure/services/Jwt.service';
import { AuditService } from '../../../src/shared/audit/audit.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { CacheService } from '../../../src/shared/cache/cache.service';
import { UserEntity, UserStatus, Role } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { RefreshTokenRequestDto } from '../../../src/modules/auth/application/dtos/RefreshToken.dto';
import { AuditAction } from '../../../src/shared/audit/enums/AuditAction.enum';

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase: RefreshTokenUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockAuditService: jest.Mocked<AuditService>;
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

    mockJwtService = {
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockAuditService = {
      log: jest.fn(),
      logAccessDenied: jest.fn(),
      logAuthenticationFailure: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    // Mock Prisma transaction
    mockPrismaService = {
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    mockCacheService = {
      invalidateUser: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    refreshTokenUseCase = new RefreshTokenUseCase(
      mockUserRepository,
      mockJwtService,
      mockAuditService,
      mockPrismaService,
      mockCacheService
    );
  });

  describe('Successful Token Refresh', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'valid.refresh.token',
      };

      const tokenPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: Role.MEMBER,
        tokenVersion: 5,
      };

      const mockUser = new UserEntity(
        'user123',
        Email.create('test@example.com'),
        'hashedPassword',
        'Test',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        5 // tokenVersion matches payload
      );

      const newTokens = {
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      };

      mockJwtService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Mock transaction to execute callback immediately
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            update: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);
      mockJwtService.generateTokenPair.mockResolvedValue(newTokens);

      // Act
      const result = await refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toEqual({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });

      expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith(dto.refreshToken);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user123');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockCacheService.invalidateUser).toHaveBeenCalledWith('user123');
      expect(mockJwtService.generateTokenPair).toHaveBeenCalledWith({
        sub: 'user123',
        email: 'test@example.com',
        role: Role.MEMBER,
        tokenVersion: 6, // Incremented
      });
    });

    it('should increment tokenVersion during refresh (token rotation)', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'valid.refresh.token',
      };

      const tokenPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: Role.MEMBER,
        tokenVersion: 10,
      };

      const mockUser = new UserEntity(
        'user123',
        Email.create('test@example.com'),
        'hashedPassword',
        'Test',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        10
      );

      const mockUpdateUser = jest.fn().mockResolvedValue({});
      const mockCreateAuditLog = jest.fn().mockResolvedValue({});

      mockJwtService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: mockUpdateUser },
          auditLog: { create: mockCreateAuditLog },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);
      mockJwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      });

      // Act
      await refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent');

      // Assert - Verify tokenVersion was incremented
      expect(mockUpdateUser).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          tokenVersion: 11, // Incremented from 10 to 11
          updatedAt: expect.any(Date),
        },
      });

      // Verify audit log includes new tokenVersion
      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          action: AuditAction.REFRESH_TOKEN,
          details: { tokenVersion: 11 },
          success: true,
        }),
      });
    });

    it('should invalidate user cache after token rotation', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'valid.refresh.token',
      };

      const tokenPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: Role.MEMBER,
        tokenVersion: 3,
      };

      const mockUser = new UserEntity(
        'user123',
        Email.create('test@example.com'),
        'hashedPassword',
        'Test',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        3
      );

      mockJwtService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: { update: jest.fn().mockResolvedValue({}) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      mockCacheService.invalidateUser.mockResolvedValue(undefined);
      mockJwtService.generateTokenPair.mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      });

      // Act
      await refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent');

      // Assert - Cache invalidation must occur after token rotation
      expect(mockCacheService.invalidateUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('Failed Refresh - Invalid/Expired Token', () => {
    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'invalid.refresh.token',
      };

      mockJwtService.verifyRefreshToken.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        'unknown',
        AuditAction.REFRESH_TOKEN,
        expect.stringContaining('Invalid or expired token'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({ error: 'Invalid token' })
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'expired.refresh.token',
      };

      mockJwtService.verifyRefreshToken.mockRejectedValue(new Error('Token expired'));

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        'unknown',
        AuditAction.REFRESH_TOKEN,
        expect.stringContaining('Invalid or expired token'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({ error: 'Token expired' })
      );
    });
  });

  describe('Failed Refresh - User Not Found', () => {
    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'valid.refresh.token',
      };

      const tokenPayload = {
        sub: 'nonexistent-user',
        email: 'deleted@example.com',
        role: Role.MEMBER,
        tokenVersion: 1,
      };

      mockJwtService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        'deleted@example.com',
        AuditAction.REFRESH_TOKEN,
        expect.stringContaining('User not found'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({ userId: 'nonexistent-user' })
      );
    });
  });

  describe('Failed Refresh - Inactive User', () => {
    it('should throw UnauthorizedException for suspended user', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'valid.refresh.token',
      };

      const tokenPayload = {
        sub: 'user123',
        email: 'suspended@example.com',
        role: Role.MEMBER,
        tokenVersion: 2,
      };

      const suspendedUser = new UserEntity(
        'user123',
        Email.create('suspended@example.com'),
        'hashedPassword',
        'Suspended',
        'User',
        Role.MEMBER,
        UserStatus.SUSPENDED,
        'acc123',
        new Date(),
        new Date(),
        2
      );

      mockJwtService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserRepository.findById.mockResolvedValue(suspendedUser);

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        'suspended@example.com',
        AuditAction.REFRESH_TOKEN,
        expect.stringContaining('User status is SUSPENDED'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({
          userId: 'user123',
          status: UserStatus.SUSPENDED
        })
      );
    });

    it('should throw UnauthorizedException for invited (not activated) user', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'valid.refresh.token',
      };

      const tokenPayload = {
        sub: 'user123',
        email: 'invited@example.com',
        role: Role.MEMBER,
        tokenVersion: 0,
      };

      const invitedUser = new UserEntity(
        'user123',
        Email.create('invited@example.com'),
        'hashedPassword',
        'Invited',
        'User',
        Role.MEMBER,
        UserStatus.INVITED,
        'acc123',
        new Date(),
        new Date(),
        0
      );

      mockJwtService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserRepository.findById.mockResolvedValue(invitedUser);

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        'invited@example.com',
        AuditAction.REFRESH_TOKEN,
        expect.stringContaining('User status is INVITED'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({
          userId: 'user123',
          status: UserStatus.INVITED
        })
      );
    });
  });

  describe('Failed Refresh - Token Version Mismatch (Security Critical)', () => {
    it('should throw UnauthorizedException when token version does not match (revoked token)', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'revoked.refresh.token',
      };

      const tokenPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: Role.MEMBER,
        tokenVersion: 5, // Old token version
      };

      const mockUser = new UserEntity(
        'user123',
        Email.create('test@example.com'),
        'hashedPassword',
        'Test',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        8 // Current token version is higher - token was revoked
      );

      mockJwtService.verifyRefreshToken.mockResolvedValue(tokenPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        'test@example.com',
        AuditAction.REFRESH_TOKEN,
        expect.stringContaining('Token revoked or reused'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({
          userId: 'user123',
          payloadVersion: 5,
          currentVersion: 8,
        })
      );
    });

    it('should prevent token replay attacks by detecting reused refresh tokens', async () => {
      // Arrange - Simulate attacker trying to reuse an old refresh token
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'reused.refresh.token',
      };

      const attackerTokenPayload = {
        sub: 'user123',
        email: 'victim@example.com',
        role: Role.MEMBER,
        tokenVersion: 10, // Attacker has old token
      };

      const mockUser = new UserEntity(
        'user123',
        Email.create('victim@example.com'),
        'hashedPassword',
        'Victim',
        'User',
        Role.MEMBER,
        UserStatus.ACTIVE,
        'acc123',
        new Date(),
        new Date(),
        15 // Legitimate user has already refreshed multiple times
      );

      mockJwtService.verifyRefreshToken.mockResolvedValue(attackerTokenPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto, '192.168.1.100', 'malicious-agent')).rejects.toThrow(
        UnauthorizedException
      );

      // Verify security event is logged with attacker details
      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        'victim@example.com',
        AuditAction.REFRESH_TOKEN,
        expect.stringContaining('Token revoked or reused'),
        '192.168.1.100',
        'malicious-agent',
        expect.objectContaining({
          userId: 'user123',
          payloadVersion: 10,
          currentVersion: 15,
        })
      );

      // Verify no tokens were issued
      expect(mockJwtService.generateTokenPair).not.toHaveBeenCalled();

      // Verify transaction was never started (no database modification)
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
