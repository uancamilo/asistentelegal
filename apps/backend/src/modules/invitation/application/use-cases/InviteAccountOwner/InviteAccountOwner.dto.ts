import { IsEmail, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para la solicitud de invitación de un propietario de cuenta
 */
export class InviteAccountOwnerRequestDto {
  @ApiProperty({
    example: 'owner@example.com',
    description: 'Email del futuro ACCOUNT_OWNER',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 10,
    description: 'Límite de usuarios permitidos para la cuenta',
    minimum: 1,
  })
  @IsNumber({}, { message: 'maxUsers must be a number' })
  @IsPositive({ message: 'maxUsers must be a positive number' })
  @Min(1, { message: 'maxUsers must be at least 1' })
  maxUsers!: number;
}

/**
 * DTO de respuesta tras enviar la invitación
 */
export class InviteAccountOwnerResponseDto {
  @ApiProperty({
    example: 'inv_123456',
    description: 'ID de la invitación',
  })
  id!: string;

  @ApiProperty({
    example: 'owner@example.com',
    description: 'Email del invitado',
  })
  email!: string;

  @ApiProperty({
    example: 'acc_123456',
    description: 'ID de la cuenta',
  })
  accountId!: string;

  @ApiProperty({
    example: 10,
    description: 'Límite de usuarios para la cuenta',
  })
  maxUsers!: number;

  @ApiPropertyOptional({
    example: '2025-11-15T00:00:00.000Z',
    description: 'Fecha de expiración de la invitación',
  })
  expiresAt!: Date;

  @ApiProperty({
    example: 'PENDING',
    description: 'Estado de la invitación',
    enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'],
  })
  status!: string;

  @ApiPropertyOptional({
    example: '2025-11-08T00:00:00.000Z',
    description: 'Fecha de creación',
  })
  createdAt!: Date;
}
