import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO que representa una cuenta en el listado
 */
export class AccountSummaryDto {
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

/**
 * DTO de respuesta para el listado de cuentas
 */
export class ListAccountsResponseDto {
  @ApiProperty({
    type: [AccountSummaryDto],
    description: 'Lista de cuentas',
  })
  accounts!: AccountSummaryDto[];

  @ApiProperty({
    example: 10,
    description: 'Total de cuentas retornadas',
  })
  total!: number;
}
