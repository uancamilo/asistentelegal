import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Logout successful',
    description: 'Mensaje de confirmación de logout',
  })
  message!: string;
}
