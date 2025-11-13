import { ValidationError } from '../errors/user.errors';

export class Email {
  private readonly value: string;

  private constructor(email: string) {
    this.value = email.toLowerCase().trim();
  }

  static create(email: string): Email {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    const trimmedEmail = email.trim();

    if (!this.isValid(trimmedEmail)) {
      throw new ValidationError('Invalid email format');
    }

    return new Email(trimmedEmail);
  }

  private static isValid(email: string): boolean {
    // RFC 5322 regex simplificado
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
