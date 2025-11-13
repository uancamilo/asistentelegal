import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta tras eliminar una cuenta
 *
 * IMPORTANTE: Solo SUPER_ADMIN puede eliminar cuentas.
 * No se pueden eliminar:
 * - Cuentas del sistema (isSystemAccount = true)
 * - Cuentas con usuarios activos
 */
export class DeleteAccountResponseDto {
  @ApiProperty({
    example: 'Account deleted successfully',
    description: 'Mensaje de confirmación',
  })
  message!: string;

  @ApiProperty({
    example: 'acc_123456',
    description: 'ID de la cuenta eliminada',
  })
  id!: string;
}
