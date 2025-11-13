import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from '../../../src/modules/auth/application/use-cases/Login.usecase';
import { IUserRepository } from '../../../src/modules/user/domain/interfaces/IUserRepository';
import { JwtService } from '../../../src/modules/auth/infrastructure/services/Jwt.service';
import { PasswordService } from '../../../src/modules/user/infrastructure/services/Password.service';
import { AuditService } from '../../../src/shared/audit/audit.service';
import { UserEntity, UserStatus, Role } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';
import { LoginRequestDto } from '../../../src/modules/auth/application/dtos/Login.dto';

describe('LoginUseCase', () => {
  let loginUseCase: LoginUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockPasswordService: jest.Mocked<PasswordService>;
  let mockAuditService: jest.Mocked<AuditService>;

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

    mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as jest.Mocked<PasswordService>;

    mockAuditService = {
      log: jest.fn(),
      logAccessDenied: jest.fn(),
      logAuthenticationFailure: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    loginUseCase = new LoginUseCase(
      mockUserRepository,
      mockPasswordService,
      mockJwtService,
      mockAuditService
    );
  });

  describe('Successful Login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginDto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'ValidPass123!',
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
        0
      );

      const mockTokens = {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockResolvedValue(mockTokens);

      // Act
      const result = await loginUseCase.execute(loginDto, '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toEqual({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        user: {
          id: mockUser.id,
          email: mockUser.email.getValue(),
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          status: mockUser.status,
        },
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(Email.create(loginDto.email));
      expect(mockPasswordService.verify).toHaveBeenCalledWith(
        'hashedPassword',
        loginDto.password
      );
      expect(mockJwtService.generateTokenPair).toHaveBeenCalled();
    });
  });

  describe('Failed Login - Invalid Credentials', () => {
    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      const loginDto: LoginRequestDto = {
        email: 'nonexistent@example.com',
        password: 'ValidPass123!',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(loginUseCase.execute(loginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        loginDto.email,
        expect.anything(),
        expect.stringContaining('Invalid credentials'),
        '127.0.0.1',
        'test-agent'
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      // Arrange
      const loginDto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'WrongPass123!',
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
        0
      );

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(false);

      // Act & Assert
      await expect(loginUseCase.execute(loginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        loginDto.email,
        expect.anything(),
        expect.stringContaining('wrong password'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({ userId: 'user123' })
      );
    });
  });

  describe('Failed Login - Account Status', () => {
    it('should throw UnauthorizedException for suspended user', async () => {
      // Arrange
      const loginDto: LoginRequestDto = {
        email: 'suspended@example.com',
        password: 'ValidPass123!',
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
        0
      );

      mockUserRepository.findByEmail.mockResolvedValue(suspendedUser);
      mockPasswordService.verify.mockResolvedValue(true);

      // Act & Assert
      await expect(loginUseCase.execute(loginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        loginDto.email,
        expect.anything(),
        expect.stringContaining('suspended'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({ userId: 'user123', status: UserStatus.SUSPENDED })
      );
    });

    it('should throw UnauthorizedException for invited (not activated) user', async () => {
      // Arrange
      const loginDto: LoginRequestDto = {
        email: 'invited@example.com',
        password: 'ValidPass123!',
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

      mockUserRepository.findByEmail.mockResolvedValue(invitedUser);
      mockPasswordService.verify.mockResolvedValue(true);

      // Act & Assert
      await expect(loginUseCase.execute(loginDto, '127.0.0.1', 'test-agent')).rejects.toThrow(
        UnauthorizedException
      );

      expect(mockAuditService.logAuthenticationFailure).toHaveBeenCalledWith(
        loginDto.email,
        expect.anything(),
        expect.stringContaining('not activated'),
        '127.0.0.1',
        'test-agent',
        expect.objectContaining({ userId: 'user123', status: UserStatus.INVITED })
      );
    });
  });
});
