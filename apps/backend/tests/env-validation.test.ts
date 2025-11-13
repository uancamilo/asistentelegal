import 'reflect-metadata';
import { validate } from '../src/config/env.validation';

/**
 * Test suite para validar la configuración de variables de entorno
 *
 * Objetivo: Verificar que la validación de variables de entorno funciona correctamente,
 * especialmente la validación de que JWT_SECRET y JWT_REFRESH_SECRET sean diferentes.
 *
 * Validaciones clave:
 * - JWT_SECRET y JWT_REFRESH_SECRET deben ser diferentes
 * - Todas las variables requeridas deben estar presentes
 * - Los secretos JWT deben tener al menos 32 caracteres
 */
describe('Environment Variables Validation', () => {
  const baseValidConfig = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'ValidPassword123!',
    SECONDARY_ADMIN_PASSWORD: 'ValidPassword456!',
    EDITOR_PASSWORD: 'ValidPassword789!',
    PORT: '3000',
    NODE_ENV: 'development',
    JWT_SECRET: 'this-is-a-very-long-jwt-secret-with-at-least-32-characters',
    JWT_EXPIRATION: '15m',
    JWT_REFRESH_SECRET: 'this-is-a-different-jwt-refresh-secret-with-at-least-32-chars',
    JWT_REFRESH_EXPIRATION: '7d',
    CORS_ORIGIN: 'http://localhost:3000',
  };

  describe('JWT Secrets Validation', () => {
    it('should pass validation when JWT_SECRET and JWT_REFRESH_SECRET are different', () => {
      const config = { ...baseValidConfig };

      expect(() => validate(config)).not.toThrow();
    });

    it('should fail validation when JWT_SECRET and JWT_REFRESH_SECRET are identical', () => {
      const config = {
        ...baseValidConfig,
        JWT_SECRET: 'identical-secret-with-at-least-32-characters-here',
        JWT_REFRESH_SECRET: 'identical-secret-with-at-least-32-characters-here',
      };

      expect(() => validate(config)).toThrow();
      expect(() => validate(config)).toThrow(/secretsAreDifferent/);
    });

    it('should fail validation when JWT_SECRET is too short', () => {
      const config = {
        ...baseValidConfig,
        JWT_SECRET: 'short', // Menos de 32 caracteres
      };

      expect(() => validate(config)).toThrow();
    });

    it('should fail validation when JWT_REFRESH_SECRET is too short', () => {
      const config = {
        ...baseValidConfig,
        JWT_REFRESH_SECRET: 'short', // Menos de 32 caracteres
      };

      expect(() => validate(config)).toThrow();
    });

    it('should pass validation when both secrets are exactly 32 characters and different', () => {
      const config = {
        ...baseValidConfig,
        JWT_SECRET: '12345678901234567890123456789012', // Exactamente 32 caracteres
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456', // Exactamente 32 caracteres, diferente
      };

      expect(() => validate(config)).not.toThrow();
    });
  });

  describe('Required Environment Variables', () => {
    it('should fail validation when DATABASE_URL is missing', () => {
      const config: any = { ...baseValidConfig };
      delete config.DATABASE_URL;

      expect(() => validate(config)).toThrow();
    });

    it('should fail validation when ADMIN_EMAIL is missing', () => {
      const config: any = { ...baseValidConfig };
      delete config.ADMIN_EMAIL;

      expect(() => validate(config)).toThrow();
    });

    it('should fail validation when ADMIN_PASSWORD is missing', () => {
      const config: any = { ...baseValidConfig };
      delete config.ADMIN_PASSWORD;

      expect(() => validate(config)).toThrow();
    });

    it('should fail validation when JWT_SECRET is missing', () => {
      const config: any = { ...baseValidConfig };
      delete config.JWT_SECRET;

      expect(() => validate(config)).toThrow();
    });

    it('should fail validation when JWT_REFRESH_SECRET is missing', () => {
      const config: any = { ...baseValidConfig };
      delete config.JWT_REFRESH_SECRET;

      expect(() => validate(config)).toThrow();
    });
  });

  describe('Default Values', () => {
    it('should use default PORT value when not provided', () => {
      const config: any = { ...baseValidConfig };
      delete config.PORT;

      const result = validate(config);
      expect(result.PORT).toBe(3000);
    });

    it('should use default NODE_ENV value when not provided', () => {
      const config: any = { ...baseValidConfig };
      delete config.NODE_ENV;

      const result = validate(config);
      expect(result.NODE_ENV).toBe('development');
    });

    it('should use default JWT_EXPIRATION value when not provided', () => {
      const config: any = { ...baseValidConfig };
      delete config.JWT_EXPIRATION;

      const result = validate(config);
      expect(result.JWT_EXPIRATION).toBe('15m');
    });

    it('should use default JWT_REFRESH_EXPIRATION value when not provided', () => {
      const config: any = { ...baseValidConfig };
      delete config.JWT_REFRESH_EXPIRATION;

      const result = validate(config);
      expect(result.JWT_REFRESH_EXPIRATION).toBe('7d');
    });

    it('should use default CORS_ORIGIN value when not provided', () => {
      const config: any = { ...baseValidConfig };
      delete config.CORS_ORIGIN;

      const result = validate(config);
      expect(result.CORS_ORIGIN).toBe('http://localhost:3000');
    });
  });

  describe('Password Validation', () => {
    it('should fail validation when ADMIN_PASSWORD is too short', () => {
      const config = {
        ...baseValidConfig,
        ADMIN_PASSWORD: 'short', // Menos de 8 caracteres
      };

      expect(() => validate(config)).toThrow();
    });

    it('should fail validation when SECONDARY_ADMIN_PASSWORD is too short', () => {
      const config = {
        ...baseValidConfig,
        SECONDARY_ADMIN_PASSWORD: 'short', // Menos de 8 caracteres
      };

      expect(() => validate(config)).toThrow();
    });

    it('should fail validation when EDITOR_PASSWORD is too short', () => {
      const config = {
        ...baseValidConfig,
        EDITOR_PASSWORD: 'short', // Menos de 8 caracteres
      };

      expect(() => validate(config)).toThrow();
    });
  });

  describe('Environment Enum Validation', () => {
    it('should accept valid NODE_ENV values', () => {
      const validEnvironments = ['development', 'production', 'test'];

      validEnvironments.forEach((env) => {
        const config = {
          ...baseValidConfig,
          NODE_ENV: env,
        };

        expect(() => validate(config)).not.toThrow();
      });
    });

    it('should fail validation for invalid NODE_ENV values', () => {
      const config = {
        ...baseValidConfig,
        NODE_ENV: 'invalid-environment',
      };

      expect(() => validate(config)).toThrow();
    });
  });

  describe('Security Best Practices', () => {
    it('should prevent using the same secret for access and refresh tokens', () => {
      const sameSecret = 'same-secret-for-both-tokens-which-is-insecure-and-at-least-32-chars';
      const config = {
        ...baseValidConfig,
        JWT_SECRET: sameSecret,
        JWT_REFRESH_SECRET: sameSecret,
      };

      expect(() => validate(config)).toThrow();
      expect(() => validate(config)).toThrow(/secretsAreDifferent/);
    });

    it('should enforce minimum secret length of 32 characters', () => {
      const shortSecret = 'only31characterslong12345678901'; // 31 caracteres
      const config = {
        ...baseValidConfig,
        JWT_SECRET: shortSecret,
      };

      expect(() => validate(config)).toThrow();
    });

    it('should accept long secrets that exceed minimum length', () => {
      const longSecret = 'this-is-a-very-very-very-long-secret-that-exceeds-the-minimum-32-character-requirement-by-a-lot';
      const anotherLongSecret = 'another-very-very-very-long-secret-that-is-different-from-the-first-one-and-also-exceeds-32-chars';

      const config = {
        ...baseValidConfig,
        JWT_SECRET: longSecret,
        JWT_REFRESH_SECRET: anotherLongSecret,
      };

      expect(() => validate(config)).not.toThrow();
    });
  });
});
