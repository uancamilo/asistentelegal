import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWdyaDFmMTUwMDAxdzI3Z3h6a3FkYW1lIiwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3NjA4MTAwMDgsImV4cCI6MTc2MTQxNDgwOH0.OuQ5kDqdSIMPd5OgvGNSHdOf5c2T4CgHhkyfR5nD6SI',
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'Nuevo JWT access token (válido por 15 minutos)' })
  accessToken!: string;

  @ApiProperty({ description: 'Nuevo JWT refresh token (válido por 7 días)' })
  refreshToken!: string;
}
