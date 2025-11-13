import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { sanitizeTextField } from '../../../../../shared/validators/text-sanitizer';

/**
 * DTO para actualizar una cuenta existente
 *
 * IMPORTANTE: No incluye el campo isSystemAccount.
 * El flag isSystemAccount es inmutable y solo puede ser establecido
 * durante la creación de la cuenta (a través de scripts, no API).
 *
 * Campos editables:
 * - name: Nombre de la cuenta (con validaciones)
 *
 * Nota: ownerId tampoco puede ser cambiado después de la creación
 */
export class UpdateAccountRequestDto {
  @ApiPropertyOptional({
    example: 'Acme Corporation Updated',
    description: 'Nuevo nombre de la cuenta (debe ser único, 3-100 caracteres, sin HTML o scripts)',
    minLength: 3,
    maxLength: 100,
  })
  @Transform(({ value }) => sanitizeTextField(value))
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;
}

/**
 * DTO de respuesta tras actualizar una cuenta
 */
export class UpdateAccountResponseDto {
  @ApiPropertyOptional({
    example: 'acc_123456',
    description: 'ID único de la cuenta',
  })
  id!: string;

  @ApiPropertyOptional({
    example: 'Acme Corporation Updated',
    description: 'Nombre actualizado de la cuenta',
  })
  name!: string;

  @ApiPropertyOptional({
    example: null,
    description: 'ID del propietario de la cuenta (null hasta que se asigne)',
    nullable: true,
  })
  ownerId!: string | null;

  @ApiPropertyOptional({
    example: 'cuid_admin_123',
    description: 'ID del usuario que creó la cuenta',
  })
  createdBy!: string;

  @ApiPropertyOptional({
    example: 'ACTIVE',
    description: 'Estado de la cuenta',
    enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  status!: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si es una cuenta del sistema (no puede ser cambiado)',
  })
  isSystemAccount!: boolean;

  @ApiPropertyOptional({
    example: '2025-11-04T22:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    example: '2025-11-04T22:00:00.000Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;
}
