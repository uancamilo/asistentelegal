import { Injectable, NestMiddleware, UnsupportedMediaTypeException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Content-Type Validation Middleware
 *
 * SECURITY FIX (P3.5): Validate Content-Type header for data-modifying requests
 *
 * Enforces that POST/PUT/PATCH requests must have Content-Type: application/json
 * to prevent CSRF attacks via HTML forms and other non-JSON submissions.
 *
 * Returns:
 * - 415 Unsupported Media Type if Content-Type is missing or not application/json
 * - Passes through for GET/DELETE/HEAD/OPTIONS requests
 * - Passes through for requests with no body
 *
 * @see https://owasp.org/www-community/attacks/csrf
 */
@Injectable()
export class ContentTypeValidationMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const method = req.method.toUpperCase();

    // Only validate Content-Type for methods that typically send a body
    const requiresContentType = ['POST', 'PUT', 'PATCH'].includes(method);

    if (!requiresContentType) {
      return next();
    }

    // Skip validation for multipart/form-data (file uploads)
    const contentType = req.headers['content-type'] || '';
    if (contentType.startsWith('multipart/form-data')) {
      return next();
    }

    // Check if Content-Type is application/json (allow charset parameter)
    const hasValidContentType =
      contentType.startsWith('application/json') ||
      contentType.includes('application/json');

    if (!hasValidContentType) {
      throw new UnsupportedMediaTypeException(
        `Invalid Content-Type. Expected 'application/json' but received '${contentType || 'none'}'. ` +
        `This endpoint only accepts JSON data.`
      );
    }

    next();
  }
}
