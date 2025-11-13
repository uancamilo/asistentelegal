import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de respuesta para validación de invitación (válida)
 */
export class ValidateInvitationValidResponseDto {
  @ApiProperty({
    example: true,
    description: 'Indica si la invitación es válida',
  })
  valid!: true;

  @ApiProperty({
    example: 'owner@example.com',
    description: 'Email del invitado',
  })
  email!: string;

  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Nombre de la cuenta',
  })
  accountName!: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Límite de usuarios para la cuenta',
  })
  maxUsers!: number;
}

/**
 * DTO de respuesta para validación de invitación (inválida)
 */
export class ValidateInvitationInvalidResponseDto {
  @ApiProperty({
    example: false,
    description: 'Indica si la invitación es válida',
  })
  valid!: false;

  @ApiProperty({
    example: 'TOKEN_EXPIRED',
    description: 'Razón por la cual la invitación no es válida',
    enum: ['TOKEN_NOT_FOUND', 'TOKEN_EXPIRED', 'ALREADY_ACCEPTED', 'ALREADY_CANCELLED'],
  })
  reason!: string;
}

/**
 * DTO de respuesta para validación de invitación (union type)
 */
export type ValidateInvitationResponseDto =
  | ValidateInvitationValidResponseDto
  | ValidateInvitationInvalidResponseDto;
