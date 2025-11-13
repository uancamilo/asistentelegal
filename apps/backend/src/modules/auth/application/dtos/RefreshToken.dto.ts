import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example: 'invalid.refresh.token.placeholder',
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'Nuevo JWT access token (válido por 15 minutos)',
    example: 'invalid.access.token.placeholder',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Nuevo JWT refresh token (válido por 7 días)',
    example: 'invalid.refresh.token.placeholder',
  })
  refreshToken!: string;
}
