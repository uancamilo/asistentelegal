import { BadRequestException } from '@nestjs/common';
import { CuidValidationPipe } from './cuid-validation.pipe';

// Mock the @paralleldrive/cuid2 module
jest.mock('@paralleldrive/cuid2', () => ({
  isCuid: jest.fn((value: string) => {
    // Mock implementation: CUID2 format validation
    // 24 characters, lowercase alphanumeric, starts with letter
    const cuidRegex = /^[a-z][a-z0-9]{23}$/;
    return cuidRegex.test(value);
  }),
}));

describe('CuidValidationPipe', () => {
  let pipe: CuidValidationPipe;

  beforeEach(() => {
    pipe = new CuidValidationPipe();
  });

  describe('transform', () => {
    it('should pass valid CUID format', () => {
      // Valid CUID2 format: starts with letter, 24 chars, lowercase alphanumeric
      const validCuid = 'clw12abc34def56ghi78jklm';
      expect(pipe.transform(validCuid)).toBe(validCuid);
    });

    it('should throw BadRequestException for empty string', () => {
      expect(() => pipe.transform('')).toThrow(BadRequestException);
      expect(() => pipe.transform('')).toThrow('ID parameter is required');
    });

    it('should throw BadRequestException for invalid format (too short)', () => {
      const invalidCuid = 'clw12abc';
      expect(() => pipe.transform(invalidCuid)).toThrow(BadRequestException);
      expect(() => pipe.transform(invalidCuid)).toThrow('Invalid ID format');
    });

    it('should throw BadRequestException for invalid format (contains uppercase)', () => {
      const invalidCuid = 'CLW12abc34def56ghi78jklm';
      expect(() => pipe.transform(invalidCuid)).toThrow(BadRequestException);
      expect(() => pipe.transform(invalidCuid)).toThrow('Invalid ID format');
    });

    it('should throw BadRequestException for invalid format (contains special chars)', () => {
      const invalidCuid = 'clw12abc-34def-56ghi78jk';
      expect(() => pipe.transform(invalidCuid)).toThrow(BadRequestException);
      expect(() => pipe.transform(invalidCuid)).toThrow('Invalid ID format');
    });

    it('should throw BadRequestException for invalid format (starts with number)', () => {
      const invalidCuid = '1lw12abc34def56ghi78jklm';
      expect(() => pipe.transform(invalidCuid)).toThrow(BadRequestException);
      expect(() => pipe.transform(invalidCuid)).toThrow('Invalid ID format');
    });

    it('should throw BadRequestException for classic hex IDs', () => {
      const hexId = '507f1f77bcf86cd799439011'; // 24-char hex (like old MongoDB ObjectId)
      expect(() => pipe.transform(hexId)).toThrow(BadRequestException);
      expect(() => pipe.transform(hexId)).toThrow('Invalid ID format');
    });

    it('should throw BadRequestException for UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => pipe.transform(uuid)).toThrow(BadRequestException);
      expect(() => pipe.transform(uuid)).toThrow('Invalid ID format');
    });
  });
});
