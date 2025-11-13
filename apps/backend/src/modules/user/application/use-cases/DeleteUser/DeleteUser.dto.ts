import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserResponseDto {
  @ApiProperty({ description: 'ID del usuario eliminado' })
  id!: string;

  @ApiProperty({ description: 'Email del usuario eliminado' })
  email!: string;

  @ApiProperty({ description: 'Mensaje de confirmación' })
  message!: string;
}
