import { ApiProperty } from '@nestjs/swagger';

export class GetAccountUsersResponseDto {
  @ApiProperty({
    description: 'Lista de usuarios que pertenecen a la cuenta',
    type: 'array',
  })
  users!: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    createdAt: Date;
  }>;

  @ApiProperty({
    description: 'Número total de usuarios',
    example: 5,
  })
  total!: number;
}
