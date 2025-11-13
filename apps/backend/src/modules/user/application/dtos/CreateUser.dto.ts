import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../domain/entities/User.entity';
import { IsValidName } from '../../../../shared/validators/name.validator';
import { sanitizeTextField } from '../../../../shared/validators/text-sanitizer';

export class CreateUserRequestDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario (2-50 caracteres, solo letras, espacios, guiones, apóstrofes)',
  })
  @Transform(({ value }) => sanitizeTextField(value))
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @IsValidName()
  firstName!: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario (2-50 caracteres, solo letras, espacios, guiones, apóstrofes)',
  })
  @Transform(({ value }) => sanitizeTextField(value))
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsValidName()
  lastName!: string;

  @ApiProperty({
    enum: Role,
    example: Role.MEMBER,
    description:
      'Rol del usuario. SUPER_ADMIN puede crear todos, ADMIN puede crear ACCOUNT_OWNER, ACCOUNT_OWNER puede crear MEMBER',
  })
  @IsEnum(Role, { message: 'Role must be a valid role' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: Role;

  @ApiPropertyOptional({
    example: 'cuid123456',
    description: 'ID de la cuenta (requerido solo para MEMBER)',
  })
  @IsString({ message: 'Account ID must be a string' })
  @IsOptional()
  accountId?: string;
}

export class CreateUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: Role })
  role!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  accountId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
