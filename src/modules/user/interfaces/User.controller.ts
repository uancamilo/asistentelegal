import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateUserUseCase } from '../application/use-cases/CreateUser.usecase';
import { GetUserUseCase } from '../application/use-cases/GetUser.usecase';
import { ListUsersUseCase } from '../application/use-cases/ListUsers.usecase';
import { CreateUserRequestDto, CreateUserResponseDto } from '../application/dtos/CreateUser.dto';
import { GetUserResponseDto, ListUsersResponseDto } from '../application/dtos/GetUser.dto';
import { JwtAuthGuard } from '../../../shared/guards/JwtAuth.guard';
import { RolesGuard } from '../../../shared/guards/Roles.guard';
import { Roles } from '../../../shared/decorators/Roles.decorator';
import { CurrentUser } from '../../../shared/decorators/CurrentUser.decorator';
import { UserEntity, Role } from '../domain/entities/User.entity';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER)
  @ApiOperation({
    summary: 'Crear usuario',
    description:
      'Crea un nuevo usuario. SUPER_ADMIN puede crear todos los roles, ADMIN puede crear ACCOUNT_OWNER, ACCOUNT_OWNER puede crear MEMBER',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente', type: CreateUserResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No tiene permisos para crear este rol' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  async create(
    @Body() createUserDto: CreateUserRequestDto,
    @CurrentUser() currentUser: UserEntity
  ): Promise<CreateUserResponseDto> {
    return await this.createUserUseCase.execute(createUserDto, currentUser);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER)
  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Lista usuarios según permisos. SUPER_ADMIN ve todos, ADMIN ve solo clientes, ACCOUNT_OWNER ve su cuenta',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios', type: ListUsersResponseDto })
  @ApiResponse({ status: 403, description: 'No tiene permisos para listar usuarios' })
  async list(@CurrentUser() currentUser: UserEntity): Promise<ListUsersResponseDto> {
    return await this.listUsersUseCase.execute(currentUser);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obtener perfil propio',
    description: 'Obtiene el perfil del usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Perfil del usuario', type: GetUserResponseDto })
  async getProfile(@CurrentUser() currentUser: UserEntity): Promise<GetUserResponseDto> {
    return await this.getUserUseCase.execute(currentUser.id, currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Obtiene un usuario específico. Los permisos se verifican según el rol',
  })
  @ApiResponse({ status: 200, description: 'Usuario encontrado', type: GetUserResponseDto })
  @ApiResponse({ status: 403, description: 'No tiene permisos para ver este usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getById(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity
  ): Promise<GetUserResponseDto> {
    return await this.getUserUseCase.execute(id, currentUser);
  }
}
