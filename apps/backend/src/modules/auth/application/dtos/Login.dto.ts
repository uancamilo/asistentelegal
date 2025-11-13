import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @ApiProperty({
    example: 'admin@email.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'admin123',
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token (válido por 15 minutos)',
    example: 'invalid.access.token.placeholder',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token (válido por 7 días)',
    example: 'invalid.refresh.token.placeholder',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    example: {
      id: 'cuid123456',
      email: 'admin@email.com',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  })
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };
}
