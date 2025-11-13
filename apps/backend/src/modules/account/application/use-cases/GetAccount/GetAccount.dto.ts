import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para solicitar una cuenta por ID
 */
export class GetAccountRequestDto {
  @ApiProperty({
    example: 'acc_123456',
    description: 'ID de la cuenta a obtener',
  })
  @IsString({ message: 'Account ID must be a string' })
  @IsNotEmpty({ message: 'Account ID is required' })
  accountId!: string;
}

/**
 * DTO de respuesta con detalles completos de la cuenta
 */
export class GetAccountResponseDto {
  @ApiProperty({
    example: 'acc_123456',
    description: 'ID único de la cuenta',
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
    description: 'ID del usuario que creó la cuenta',
  })
  createdBy!: string;

  @ApiProperty({
    example: 'PENDING',
    description: 'Estado de la cuenta',
    enum: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  status!: string;

  @ApiProperty({
    example: false,
    description: 'Indica si es una cuenta del sistema',
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
