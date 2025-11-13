import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { CsrfGuard } from '../../../src/shared/guards/Csrf.guard';

describe('CsrfGuard', () => {
  let csrfGuard: CsrfGuard;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as jest.Mocked<ConfigService>;

    csrfGuard = new CsrfGuard(mockConfigService);
  });

  const createMockExecutionContext = (
    method: string,
    headers: Record<string, string>
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers,
        }),
      }),
    } as ExecutionContext;
  };

  describe('Safe HTTP Methods (No CSRF Check)', () => {
    it('should allow GET requests without Origin header', () => {
      // Arrange
      const context = createMockExecutionContext('GET', {});

      // Act
      const result = csrfGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow HEAD requests without Origin header', () => {
      // Arrange
      const context = createMockExecutionContext('HEAD', {});

      // Act
      const result = csrfGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow OPTIONS requests without Origin header', () => {
      // Arrange
      const context = createMockExecutionContext('OPTIONS', {});

      // Act
      const result = csrfGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('State-Modifying Methods (CSRF Protection)', () => {
    describe('POST Requests', () => {
      it('should allow POST request with valid Origin header', () => {
        // Arrange
        const context = createMockExecutionContext('POST', {
          origin: 'http://localhost:3000',
        });

        // Act
        const result = csrfGuard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException for POST without Origin or Referer', () => {
        // Arrange
        const context = createMockExecutionContext('POST', {});

        // Act & Assert
        expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => csrfGuard.canActivate(context)).toThrow('Missing Origin or Referer header');
      });

      it('should throw ForbiddenException for POST with invalid Origin', () => {
        // Arrange
        const context = createMockExecutionContext('POST', {
          origin: 'http://malicious-site.com',
        });

        // Act & Assert
        expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
      });

      it('should allow POST request with valid Referer header when Origin is missing', () => {
        // Arrange
        const context = createMockExecutionContext('POST', {
          referer: 'http://localhost:3000/login',
        });

        // Act
        const result = csrfGuard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('PUT Requests', () => {
      it('should allow PUT request with valid Origin', () => {
        // Arrange
        const context = createMockExecutionContext('PUT', {
          origin: 'http://localhost:3000',
        });

        // Act
        const result = csrfGuard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException for PUT with invalid Origin', () => {
        // Arrange
        const context = createMockExecutionContext('PUT', {
          origin: 'http://attacker.com',
        });

        // Act & Assert
        expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
      });
    });

    describe('PATCH Requests', () => {
      it('should allow PATCH request with valid Origin', () => {
        // Arrange
        const context = createMockExecutionContext('PATCH', {
          origin: 'http://localhost:3000',
        });

        // Act
        const result = csrfGuard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException for PATCH without Origin', () => {
        // Arrange
        const context = createMockExecutionContext('PATCH', {});

        // Act & Assert
        expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => csrfGuard.canActivate(context)).toThrow('Missing Origin or Referer header');
      });
    });

    describe('DELETE Requests', () => {
      it('should allow DELETE request with valid Origin', () => {
        // Arrange
        const context = createMockExecutionContext('DELETE', {
          origin: 'http://localhost:3000',
        });

        // Act
        const result = csrfGuard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should throw ForbiddenException for DELETE with invalid Origin', () => {
        // Arrange
        const context = createMockExecutionContext('DELETE', {
          origin: 'https://evil.com',
        });

        // Act & Assert
        expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
      });
    });
  });

  describe('Origin Normalization', () => {
    it('should normalize Origin with trailing slash', () => {
      // Arrange
      mockConfigService.getOrThrow.mockReturnValue('http://localhost:3000/');
      csrfGuard = new CsrfGuard(mockConfigService);

      const context = createMockExecutionContext('POST', {
        origin: 'http://localhost:3000',
      });

      // Act
      const result = csrfGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should normalize Origin with path', () => {
      // Arrange
      const context = createMockExecutionContext('POST', {
        origin: 'http://localhost:3000/some/path',
      });

      // Act
      const result = csrfGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle HTTPS origin correctly', () => {
      // Arrange
      mockConfigService.getOrThrow.mockReturnValue('https://example.com');
      csrfGuard = new CsrfGuard(mockConfigService);

      const context = createMockExecutionContext('POST', {
        origin: 'https://example.com',
      });

      // Act
      const result = csrfGuard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject different protocol even with same domain', () => {
      // Arrange
      mockConfigService.getOrThrow.mockReturnValue('https://localhost:3000');
      csrfGuard = new CsrfGuard(mockConfigService);

      const context = createMockExecutionContext('POST', {
        origin: 'http://localhost:3000', // HTTP instead of HTTPS
      });

      // Act & Assert
      expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
    });

    it('should reject different port even with same domain', () => {
      // Arrange
      mockConfigService.getOrThrow.mockReturnValue('http://localhost:3000');
      csrfGuard = new CsrfGuard(mockConfigService);

      const context = createMockExecutionContext('POST', {
        origin: 'http://localhost:8080', // Different port
      });

      // Act & Assert
      expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
    });
  });

  describe('Security Scenarios', () => {
    it('should prevent CSRF attack from different domain', () => {
      // Arrange
      const context = createMockExecutionContext('POST', {
        origin: 'http://attacker.com',
      });

      // Act & Assert
      expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
    });

    it('should prevent CSRF attack from subdomain', () => {
      // Arrange
      mockConfigService.getOrThrow.mockReturnValue('http://example.com');
      csrfGuard = new CsrfGuard(mockConfigService);

      const context = createMockExecutionContext('POST', {
        origin: 'http://evil.example.com', // Subdomain attack
      });

      // Act & Assert
      expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
    });

    it('should prevent CSRF attack with similar domain name', () => {
      // Arrange
      mockConfigService.getOrThrow.mockReturnValue('http://example.com');
      csrfGuard = new CsrfGuard(mockConfigService);

      const context = createMockExecutionContext('POST', {
        origin: 'http://example.com.attacker.com', // Similar domain
      });

      // Act & Assert
      expect(() => csrfGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => csrfGuard.canActivate(context)).toThrow('Invalid Origin - Possible CSRF attack');
    });
  });
});
