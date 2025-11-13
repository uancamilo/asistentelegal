import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../../../src/shared/guards/Roles.guard';
import { Role, UserEntity, UserStatus } from '../../../src/modules/user/domain/entities/User.entity';
import { Email } from '../../../src/modules/user/domain/value-objects/Email.vo';

describe('RolesGuard', () => {
  let rolesGuard: RolesGuard;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    rolesGuard = new RolesGuard(mockReflector);
  });

  const createMockExecutionContext = (user?: UserEntity): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockUser = (role: Role): UserEntity => {
    return new UserEntity(
      'user123',
      Email.create('test@example.com'),
      'hashedPassword',
      'Test',
      'User',
      role,
      UserStatus.ACTIVE,
      'acc123',
      new Date(),
      new Date(),
      0
    );
  };

  describe('Role Authorization', () => {
    it('should allow access when user has required role', () => {
      // Arrange
      const mockUser = createMockUser(Role.ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      // Arrange
      const mockUser = createMockUser(Role.ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.SUPER_ADMIN, Role.ADMIN, Role.MEMBER]);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow SUPER_ADMIN when SUPER_ADMIN is in required roles', () => {
      // Arrange
      const mockUser = createMockUser(Role.SUPER_ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.SUPER_ADMIN, Role.ADMIN]);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow MEMBER access to MEMBER-only endpoints', () => {
      // Arrange
      const mockUser = createMockUser(Role.MEMBER);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Access Denial', () => {
    it('should deny access when user does not have required role', () => {
      // Arrange
      const mockUser = createMockUser(Role.MEMBER);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(context)).toThrow('Access denied. Required roles: ADMIN');
    });

    it('should deny MEMBER access to ADMIN endpoints', () => {
      // Arrange
      const mockUser = createMockUser(Role.MEMBER);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.SUPER_ADMIN]);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(context)).toThrow('Access denied. Required roles: ADMIN, SUPER_ADMIN');
    });

    it('should deny ADMIN access to SUPER_ADMIN-only endpoints', () => {
      // Arrange
      const mockUser = createMockUser(Role.ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.SUPER_ADMIN]);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(context)).toThrow('Access denied. Required roles: SUPER_ADMIN');
    });
  });

  describe('Fail-Closed Security Policy', () => {
    it('should deny access when no roles are specified (fail-closed)', () => {
      // Arrange
      const mockUser = createMockUser(Role.ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([]);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert - Fail-closed: deny access by default
      expect(result).toBe(false);
    });

    it('should deny access when roles metadata is null', () => {
      // Arrange
      const mockUser = createMockUser(Role.ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue(null);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert - Fail-closed: deny access by default
      expect(result).toBe(false);
    });

    it('should deny access when roles metadata is undefined', () => {
      // Arrange
      const mockUser = createMockUser(Role.ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert - Fail-closed: deny access by default
      expect(result).toBe(false);
    });
  });

  describe('Authentication Requirement', () => {
    it('should throw ForbiddenException when user is not authenticated', () => {
      // Arrange
      const context = createMockExecutionContext(undefined); // No user in request
      mockReflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should throw ForbiddenException when user is null', () => {
      // Arrange
      const context = createMockExecutionContext(null as any);
      mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(context)).toThrow('User not authenticated');
    });
  });

  describe('Reflector Integration', () => {
    it('should check both handler and class level metadata', () => {
      // Arrange
      const mockUser = createMockUser(Role.ADMIN);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      // Act
      rolesGuard.canActivate(context);

      // Assert - Verify reflector was called with correct parameters
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        'roles',
        [context.getHandler(), context.getClass()]
      );
    });

    it('should use handler-level metadata over class-level (override behavior)', () => {
      // Arrange
      const mockUser = createMockUser(Role.MEMBER);
      const context = createMockExecutionContext(mockUser);

      // Reflector returns handler-level [Role.MEMBER], overriding class-level [Role.ADMIN]
      mockReflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);

      // Act
      const result = rolesGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Multiple Role Scenarios', () => {
    it('should handle multiple users with different roles correctly', () => {
      // Arrange
      const adminUser = createMockUser(Role.ADMIN);
      const memberUser = createMockUser(Role.MEMBER);
      const superAdminUser = createMockUser(Role.SUPER_ADMIN);

      const adminContext = createMockExecutionContext(adminUser);
      const memberContext = createMockExecutionContext(memberUser);
      const superAdminContext = createMockExecutionContext(superAdminUser);

      // Endpoint requires ADMIN or SUPER_ADMIN
      mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.SUPER_ADMIN]);

      // Act & Assert
      expect(rolesGuard.canActivate(adminContext)).toBe(true);
      expect(rolesGuard.canActivate(superAdminContext)).toBe(true);
      expect(() => rolesGuard.canActivate(memberContext)).toThrow(ForbiddenException);
    });

    it('should handle single role requirement correctly', () => {
      // Arrange
      const memberUser = createMockUser(Role.MEMBER);
      const adminUser = createMockUser(Role.ADMIN);

      const memberContext = createMockExecutionContext(memberUser);
      const adminContext = createMockExecutionContext(adminUser);

      // Endpoint requires only MEMBER
      mockReflector.getAllAndOverride.mockReturnValue([Role.MEMBER]);

      // Act & Assert
      expect(rolesGuard.canActivate(memberContext)).toBe(true);
      expect(() => rolesGuard.canActivate(adminContext)).toThrow(ForbiddenException);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message with single required role', () => {
      // Arrange
      const mockUser = createMockUser(Role.MEMBER);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow('Access denied. Required roles: ADMIN');
    });

    it('should provide clear error message with multiple required roles', () => {
      // Arrange
      const mockUser = createMockUser(Role.MEMBER);
      const context = createMockExecutionContext(mockUser);
      mockReflector.getAllAndOverride.mockReturnValue([Role.SUPER_ADMIN, Role.ADMIN]);

      // Act & Assert
      expect(() => rolesGuard.canActivate(context)).toThrow('Access denied. Required roles: SUPER_ADMIN, ADMIN');
    });
  });
});
