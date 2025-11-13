import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '../../../domain/entities/User.entity';

export class UpdateUserStatusRequestDto {
  @ApiProperty({
    description: 'Nuevo estado del usuario',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status!: UserStatus;
}

export class UpdateUserStatusResponseDto {
  @ApiProperty({ description: 'ID del usuario' })
  id!: string;

  @ApiProperty({ description: 'Email del usuario' })
  email!: string;

  @ApiProperty({ description: 'Nuevo estado' })
  status!: string;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt!: Date;
}
