import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { sanitizeTextField } from '../../../../../shared/validators/text-sanitizer';

/**
 * DTO para crear una nueva cuenta de cliente
 *
 * IMPORTANTE:
 * - No incluye ownerId: El propietario se asignará posteriormente en fase de configuración
 * - No incluye isSystemAccount: Las cuentas del sistema solo se crean mediante scripts
 * - El campo createdBy se asigna automáticamente desde el usuario autenticado
 */
export class CreateAccountRequestDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Nombre de la cuenta (debe ser único, 3-100 caracteres, sin HTML o scripts)',
    minLength: 3,
    maxLength: 100,
  })
  @Transform(({ value }) => sanitizeTextField(value))
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name!: string;
}

/**
 * DTO de respuesta tras crear una cuenta
 */
export class CreateAccountResponseDto {
  @ApiProperty({
    example: 'acc_123456',
    description: 'ID único de la cuenta creada',
  })
  id!: string;

  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Nombre de la cuenta',
  })
  name!: string;

  @ApiProperty({
    example: null,
    description: 'ID del propietario de la cuenta (null hasta que se asigne)',
    nullable: true,
  })
  ownerId!: string | null;

  @ApiProperty({
    example: 'cuid_admin_123',
    description: 'ID del usuario que creó la cuenta (ADMIN o SUPER_ADMIN)',
  })
  createdBy!: string;

  @ApiProperty({
    example: 'PENDING',
    description: 'Estado de la cuenta (PENDING, ACTIVE, INACTIVE, SUSPENDED)',
    enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  status!: string;

  @ApiProperty({
    example: false,
    description: 'Indica si es una cuenta del sistema (siempre false para cuentas creadas por API)',
  })
  isSystemAccount!: boolean;

  @ApiProperty({
    example: '2025-11-04T22:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2025-11-04T22:00:00.000Z',
    description: 'Fecha de última actualización',
  })
  updatedAt!: Date;
}
