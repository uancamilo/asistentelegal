import { createId } from '@paralleldrive/cuid2';

/**
 * CUID Generator Utility
 *
 * Provides centralized CUID generation for all entities in the application.
 * CUID2 provides:
 * - Collision-resistant unique identifiers
 * - Monotonically increasing (roughly sortable by creation time)
 * - URL-safe characters only
 * - 24 characters long
 * - Starts with a letter (no leading digits)
 *
 * Usage:
 * ```typescript
 * const userId = generateCuid();
 * const accountId = generateCuid();
 * ```
 */

/**
 * Generates a new CUID (Collision-resistant Unique Identifier)
 * @returns A new CUID string (24 characters, URL-safe)
 */
export function generateCuid(): string {
  return createId();
}

/**
 * Validates if a string is a valid CUID format
 * @param value The string to validate
 * @returns true if valid CUID, false otherwise
 */
export function isValidCuid(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // CUID2 format: 24 characters, lowercase alphanumeric, starts with letter
  const cuidRegex = /^[a-z][a-z0-9]{23}$/;
  return cuidRegex.test(value);
}
