import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la solicitud de aceptación de invitación
 */
export class AcceptInvitationRequestDto {
  @ApiProperty({
    example: 'uuid-token-here',
    description: 'Token de la invitación',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;

  @ApiProperty({
    example: 'John',
    description: 'Nombre del nuevo usuario',
    minLength: 2,
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  firstName!: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Apellido del nuevo usuario',
    minLength: 2,
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  lastName!: string;

  @ApiProperty({
    example: 'securepassword123',
    description: 'Contraseña del nuevo usuario',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}

/**
 * DTO de respuesta tras aceptar la invitación
 */
export class AcceptInvitationResponseDto {
  @ApiProperty({
    description: 'Datos del usuario creado',
  })
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };

  @ApiProperty({
    description: 'Datos de la cuenta activada',
  })
  account!: {
    id: string;
    name: string;
    status: string;
    maxUsers: number;
  };
}
