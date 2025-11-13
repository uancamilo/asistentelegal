import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class InviteUserRequestDto {
  @ApiProperty({
    description: 'Email del usuario a invitar',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'MEMBER',
    enum: ['MEMBER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'],
  })
  @IsIn(['MEMBER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'])
  @IsNotEmpty()
  role!: string;
}

export class InviteUserResponseDto {
  @ApiProperty({
    description: 'ID de la invitación creada',
  })
  id!: string;

  @ApiProperty({
    description: 'Email del usuario invitado',
  })
  email!: string;

  @ApiProperty({
    description: 'Nombre del usuario invitado',
  })
  firstName!: string;

  @ApiProperty({
    description: 'Apellido del usuario invitado',
  })
  lastName!: string;

  @ApiProperty({
    description: 'Rol asignado',
  })
  role!: string;

  @ApiProperty({
    description: 'ID de la cuenta',
  })
  accountId!: string;

  @ApiProperty({
    description: 'Fecha de expiración del token',
  })
  expiresAt!: Date;

  @ApiProperty({
    description: 'Estado de la invitación',
  })
  status!: string;

  @ApiProperty({
    description: 'Fecha de creación',
  })
  createdAt!: Date;
}
