import { ValidationError } from '../errors/user.errors';

export class Password {
  private readonly value: string;

  private constructor(password: string) {
    this.value = password;
  }

  // Crear password desde texto plano (con validación)
  static create(plainPassword: string): Password {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new ValidationError('Password is required');
    }

    if (!this.isValid(plainPassword)) {
      throw new ValidationError(
        'Password must include uppercase, lowercase, number and special character.'
      );
    }

    return new Password(plainPassword);
  }

  // Crear password desde hash (sin validación)
  static fromHash(hashedPassword: string): Password {
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new ValidationError('Password hash is required');
    }
    return new Password(hashedPassword);
  }

  private static isValid(password: string): boolean {
    // Mínimo 8 caracteres
    if (password.length < 8) return false;

    // Validar presencia de caracteres requeridos
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    // Expanded special character set to support password managers
    // Includes: ! @ # $ % ^ & * ( ) , . ? " : { } | < > - + = [ ] ; / ' _ ~
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-+=\[\];/'_~]/.test(password);

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }

  getValue(): string {
    return this.value;
  }

  // No implementamos equals por seguridad
  // (no queremos comparar passwords en texto plano)
}
