import { Password } from '../src/modules/user/domain/value-objects/Password.vo';
import { ValidationError } from '../src/modules/user/domain/errors/user.errors';

/**
 * Test suite para validar complejidad de contraseñas en Password Value Object
 *
 * Objetivo: Verificar que la validación de contraseñas cumple con los
 * requisitos de seguridad OWASP para prevenir contraseñas débiles.
 *
 * Requisitos de validación:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula (A-Z)
 * - Al menos una letra minúscula (a-z)
 * - Al menos un número (0-9)
 * - Al menos un carácter especial (!@#$%^&*(),.?":{}|<>)
 *
 * Estrategia de testing:
 * - Password.create() DEBE validar la contraseña
 * - Password.fromHash() NO debe validar (asume hash válido)
 * - ValidationError debe incluir mensaje descriptivo
 */
describe('Password Value Object - Complexity Validation', () => {
  describe('Password.create() - Valid passwords', () => {
    it('should accept a valid password with all required elements', () => {
      // Password con todos los elementos: mayúscula, minúscula, número, especial
      const validPassword = 'SecureP@ss123';

      expect(() => Password.create(validPassword)).not.toThrow();

      const password = Password.create(validPassword);
      expect(password).toBeDefined();
      expect(password.getValue()).toBe(validPassword);
    });

    it('should accept various valid passwords with different special characters', () => {
      const validPasswords = [
        'Valid!Pass123',
        'Secure@2024',
        'MyP#ssw0rd',
        'Test$Pass1',
        'Strong%Pass9',
        'Compl3x^Pwd',
        'S@fePass123',
        'P@ssw0rd!',
      ];

      validPasswords.forEach((pwd) => {
        expect(() => Password.create(pwd)).not.toThrow();
      });
    });

    it('should accept password with minimum 8 characters and all requirements', () => {
      // Password exactamente de 8 caracteres con todos los requisitos
      const minValidPassword = 'Pass@123';

      expect(() => Password.create(minValidPassword)).not.toThrow();

      const password = Password.create(minValidPassword);
      expect(password.getValue()).toBe(minValidPassword);
    });
  });

  describe('Password.create() - Invalid passwords (missing requirements)', () => {
    it('should reject password without uppercase letter', () => {
      const noUppercase = 'securepass@123';

      expect(() => Password.create(noUppercase)).toThrow(ValidationError);
      expect(() => Password.create(noUppercase)).toThrow(
        'Password must include uppercase, lowercase, number and special character.'
      );
    });

    it('should reject password without lowercase letter', () => {
      const noLowercase = 'SECUREPASS@123';

      expect(() => Password.create(noLowercase)).toThrow(ValidationError);
      expect(() => Password.create(noLowercase)).toThrow(
        'Password must include uppercase, lowercase, number and special character.'
      );
    });

    it('should reject password without number', () => {
      const noNumber = 'SecurePass@';

      expect(() => Password.create(noNumber)).toThrow(ValidationError);
      expect(() => Password.create(noNumber)).toThrow(
        'Password must include uppercase, lowercase, number and special character.'
      );
    });

    it('should reject password without special character', () => {
      const noSpecialChar = 'SecurePass123';

      expect(() => Password.create(noSpecialChar)).toThrow(ValidationError);
      expect(() => Password.create(noSpecialChar)).toThrow(
        'Password must include uppercase, lowercase, number and special character.'
      );
    });

    it('should reject weak password with only numbers (common pattern)', () => {
      const weakPassword = '12345678';

      expect(() => Password.create(weakPassword)).toThrow(ValidationError);
      expect(() => Password.create(weakPassword)).toThrow(
        'Password must include uppercase, lowercase, number and special character.'
      );
    });

    it('should reject password shorter than 8 characters', () => {
      const tooShort = 'Pass@1';

      expect(() => Password.create(tooShort)).toThrow(ValidationError);
      expect(() => Password.create(tooShort)).toThrow(
        'Password must include uppercase, lowercase, number and special character.'
      );
    });

    it('should reject empty password', () => {
      const emptyPassword = '';

      expect(() => Password.create(emptyPassword)).toThrow(ValidationError);
      expect(() => Password.create(emptyPassword)).toThrow('Password is required');
    });
  });

  describe('Password.create() - Edge cases', () => {
    it('should reject null or undefined password', () => {
      expect(() => Password.create(null as any)).toThrow(ValidationError);
      expect(() => Password.create(undefined as any)).toThrow(ValidationError);
      expect(() => Password.create(null as any)).toThrow('Password is required');
    });

    it('should reject non-string password', () => {
      expect(() => Password.create(123456 as any)).toThrow(ValidationError);
      expect(() => Password.create({ password: 'test' } as any)).toThrow(ValidationError);
      expect(() => Password.create(['password'] as any)).toThrow(ValidationError);
    });

    it('should reject password with only whitespace', () => {
      const whitespacePassword = '        ';

      expect(() => Password.create(whitespacePassword)).toThrow(ValidationError);
      expect(() => Password.create(whitespacePassword)).toThrow(
        'Password must include uppercase, lowercase, number and special character.'
      );
    });

    it('should accept password with exactly 8 characters and all requirements', () => {
      const exactMinLength = 'Abc@1234';

      expect(() => Password.create(exactMinLength)).not.toThrow();
    });

    it('should accept very long password with all requirements', () => {
      const longPassword = 'VeryLongSecureP@ssword123WithManyCharacters!@#$%';

      expect(() => Password.create(longPassword)).not.toThrow();

      const password = Password.create(longPassword);
      expect(password.getValue()).toBe(longPassword);
    });
  });

  describe('Password.create() - Common weak password patterns', () => {
    it('should reject common weak passwords', () => {
      const weakPasswords = [
        'password',
        'Password',
        'password1',
        'Password1',
        'qwerty123',
        'abc12345',
        'Password123', // Sin carácter especial
        '12345678', // Solo números
        'abcdefgh', // Solo letras
      ];

      weakPasswords.forEach((weakPwd) => {
        expect(() => Password.create(weakPwd)).toThrow(ValidationError);
      });
    });
  });

  describe('Password.fromHash() - Should NOT validate', () => {
    it('should accept any hash without validation (security requirement)', () => {
      // fromHash() se usa para cargar passwords hasheadas desde la base de datos
      // NO debe validar la complejidad porque ya están hasheadas
      const hashedPassword = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890';

      expect(() => Password.fromHash(hashedPassword)).not.toThrow();

      const password = Password.fromHash(hashedPassword);
      expect(password).toBeDefined();
      expect(password.getValue()).toBe(hashedPassword);
    });

    it('should accept even weak-looking strings when using fromHash', () => {
      // fromHash() no valida complejidad, solo verifica que no sea vacío
      const weakLookingHash = '12345678';

      expect(() => Password.fromHash(weakLookingHash)).not.toThrow();

      const password = Password.fromHash(weakLookingHash);
      expect(password.getValue()).toBe(weakLookingHash);
    });

    it('should reject empty hash', () => {
      expect(() => Password.fromHash('')).toThrow(ValidationError);
      expect(() => Password.fromHash('')).toThrow('Password hash is required');
    });

    it('should reject null or undefined hash', () => {
      expect(() => Password.fromHash(null as any)).toThrow(ValidationError);
      expect(() => Password.fromHash(undefined as any)).toThrow(ValidationError);
    });
  });

  describe('Password - Immutability and encapsulation', () => {
    it('should return the same value through getValue()', () => {
      const plainPassword = 'SecureP@ss123';
      const password = Password.create(plainPassword);

      expect(password.getValue()).toBe(plainPassword);
    });

    it('should create independent instances', () => {
      const plainPassword = 'SecureP@ss123';
      const password1 = Password.create(plainPassword);
      const password2 = Password.create(plainPassword);

      // Diferentes instancias
      expect(password1).not.toBe(password2);

      // Mismo valor
      expect(password1.getValue()).toBe(password2.getValue());
    });
  });
});
