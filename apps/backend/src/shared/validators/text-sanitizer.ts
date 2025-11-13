/**
 * Text sanitization utilities for user-facing fields
 * Prevents XSS, script injection, and maintains data consistency
 */

import { Transform } from 'class-transformer';

/**
 * Sanitize a text field by:
 * 1. Trimming whitespace
 * 2. Removing script tags and HTML entities
 * 3. Removing special characters that could be used for injection
 * 4. Collapsing multiple spaces into single space
 *
 * @param text - The text to sanitize
 * @param maxLength - Maximum length (default: 100)
 * @returns Sanitized text
 */
export function sanitizeTextField(text: string, maxLength: number = 100): string {
  if (!text) return '';

  return text
    .trim() // Remove leading/trailing whitespace
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove potential XSS characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, maxLength);
}

/**
 * Sanitize long text fields (summaries, full text, etc.) by:
 * 1. Trimming whitespace
 * 2. Removing script tags and dangerous HTML
 * 3. Preserving line breaks and basic formatting
 *
 * SECURITY FIX (P2.4): Sanitize all text inputs to prevent Stored XSS
 *
 * @param text - The long text to sanitize
 * @returns Sanitized text preserving basic formatting
 */
export function sanitizeLongText(text: string): string {
  if (!text) return '';

  return text
    .trim()
    // Remove script tags and event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers like onclick=
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    // Remove all HTML tags except basic formatting (if needed, can be more strict)
    .replace(/<(?!\/?(br|p)\b)[^>]+>/gi, ''); // Allow only <br> and <p> tags
}

/**
 * Decorator to sanitize text fields in DTOs
 *
 * SECURITY FIX (P2.4): Apply sanitization to all user-facing text fields
 *
 * @param maxLength - Maximum length for short fields (default: unlimited for long text)
 * @returns Property decorator
 */
export function SanitizeText(maxLength?: number): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    // For long text (no max length or very large), use sanitizeLongText
    if (!maxLength || maxLength > 10000) {
      return sanitizeLongText(value);
    }

    // For short text fields, use sanitizeTextField with length limit
    return sanitizeTextField(value, maxLength);
  });
}

/**
 * Validate that a name contains only allowed characters:
 * - Letters (any language, including accented characters)
 * - Spaces, hyphens, apostrophes (for compound names)
 * - Dots (for abbreviations like "Dr.")
 *
 * @param name - The name to validate
 * @returns true if valid, false otherwise
 */
export function isValidNameCharacters(name: string): boolean {
  // Allow letters (Unicode), spaces, hyphens, apostrophes, dots
  // Block numbers, special characters, emojis
  const validNamePattern = /^[\p{L}\s\-'.]+$/u;
  return validNamePattern.test(name);
}

/**
 * Validate name length
 *
 * @param name - The name to validate
 * @param minLength - Minimum length (default: 2)
 * @param maxLength - Maximum length (default: 50)
 * @returns true if valid, false otherwise
 */
export function isValidNameLength(
  name: string,
  minLength: number = 2,
  maxLength: number = 50
): boolean {
  const trimmed = name.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}
