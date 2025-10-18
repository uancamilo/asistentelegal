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
      throw new ValidationError('Password must be at least 8 characters long');
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
    return password.length >= 8;
  }

  getValue(): string {
    return this.value;
  }

  // No implementamos equals por seguridad
  // (no queremos comparar passwords en texto plano)
}
