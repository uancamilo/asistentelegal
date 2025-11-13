import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { isValidNameCharacters, isValidNameLength } from './text-sanitizer';

/**
 * Custom validator for name fields (firstName, lastName, account name)
 * Validates:
 * - Length (2-50 characters)
 * - Character set (only letters, spaces, hyphens, apostrophes, dots)
 * - No script tags or special characters
 */
@ValidatorConstraint({ name: 'IsValidName', async: false })
export class IsValidNameConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    if (typeof value !== 'string') {
      return false;
    }

    const trimmed = value.trim();

    // Check length
    if (!isValidNameLength(trimmed)) {
      return false;
    }

    // Check character set
    if (!isValidNameCharacters(trimmed)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be between 2 and 50 characters and contain only letters, spaces, hyphens, apostrophes, and dots`;
  }
}

/**
 * Decorator for validating name fields
 * Usage: @IsValidName() in DTOs
 */
export function IsValidName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidNameConstraint,
    });
  };
}
