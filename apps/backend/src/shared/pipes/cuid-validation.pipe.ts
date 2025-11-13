import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Validation pipe for CUID (Collision-resistant Unique Identifier) format
 *
 * Usage: Apply to route parameters to ensure they follow CUID format
 * Example: @Param('id', CuidValidationPipe) id: string
 *
 * CUID2 format characteristics:
 * - Length: 24 characters
 * - Characters: lowercase letters (a-z) and digits (0-9)
 * - Starts with a letter
 * - URL-safe and monotonically increasing
 *
 * @throws BadRequestException if the ID is not a valid CUID
 */
@Injectable()
export class CuidValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value) {
      throw new BadRequestException('ID parameter is required');
    }

    if (!isCuid(value)) {
      throw new BadRequestException(
        `Invalid ID format. Expected a valid CUID, received: ${value}`
      );
    }

    return value;
  }
}
