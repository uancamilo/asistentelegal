import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateUserUseCase } from '../application/use-cases/CreateUser.usecase';
import { GetUserUseCase } from '../application/use-cases/GetUser.usecase';
import { ListUsersUseCase } from '../application/use-cases/ListUsers.usecase';
import { UpdateUserStatusUseCase } from '../application/use-cases/UpdateUserStatus/UpdateUserStatus.usecase';
import { UpdateUserUseCase } from '../application/use-cases/UpdateUser.usecase';
import { DeleteUserUseCase } from '../application/use-cases/DeleteUser/DeleteUser.usecase';
import { CreateUserRequestDto, CreateUserResponseDto } from '../application/dtos/CreateUser.dto';
import { GetUserResponseDto, ListUsersResponseDto } from '../application/dtos/GetUser.dto';
import { UpdateUserRequestDto, UpdateUserResponseDto } from '../application/dtos/UpdateUser.dto';
import {
  UpdateUserStatusRequestDto,
  UpdateUserStatusResponseDto,
} from '../application/use-cases/UpdateUserStatus/UpdateUserStatus.dto';
import { DeleteUserResponseDto } from '../application/use-cases/DeleteUser/DeleteUser.dto';
import { JwtAuthGuard } from '../../../shared/guards/JwtAuth.guard';
import { RolesGuard } from '../../../shared/guards/Roles.guard';
import { CsrfGuard } from '../../../shared/guards/Csrf.guard';
import { Roles } from '../../../shared/decorators/Roles.decorator';
import { CurrentUser } from '../../../shared/decorators/CurrentUser.decorator';
import { UserEntity, Role } from '../domain/entities/User.entity';
import { RedisThrottlerGuard } from '../../../shared/rate-limiting/redis-throttler.guard';
import { CuidValidationPipe } from '../../../shared/pipes/cuid-validation.pipe';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@Throttle({ default: { limit: 30, ttl: 60000 } })
@UseGuards(RedisThrottlerGuard, CsrfGuard, JwtAuthGuard, RolesGuard) // Redis-based distributed rate limiting
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER)
  @ApiOperation({
    summary: 'Crear usuario',
    description:
      'Crea un nuevo usuario. SUPER_ADMIN puede crear todos los roles, ADMIN puede crear ACCOUNT_OWNER, ACCOUNT_OWNER puede crear MEMBER',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: CreateUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No tiene permisos para crear este rol' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones. Intenta nuevamente más tarde.' })
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
      'Lista usuarios según permisos. SUPER_ADMIN ve todos, ADMIN ve solo clientes, ACCOUNT_OWNER ve su cuenta. Soporta paginación con limit y offset.',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios', type: ListUsersResponseDto })
  @ApiResponse({ status: 403, description: 'No tiene permisos para listar usuarios' })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones. Intenta nuevamente más tarde.' })
  async list(
    @CurrentUser() currentUser: UserEntity,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListUsersResponseDto> {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50; // Max 100 por petición
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return await this.listUsersUseCase.execute(currentUser, parsedLimit, parsedOffset);
  }

  @Get('me')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER, Role.EDITOR, Role.MEMBER)
  @ApiOperation({
    summary: 'Obtener perfil propio',
    description: 'Obtiene el perfil del usuario autenticado. Disponible para todos los roles.',
  })
  @ApiResponse({ status: 200, description: 'Perfil del usuario', type: GetUserResponseDto })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones. Intenta nuevamente más tarde.' })
  async getProfile(@CurrentUser() currentUser: UserEntity): Promise<GetUserResponseDto> {
    return await this.getUserUseCase.execute(currentUser.id, currentUser);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER, Role.EDITOR, Role.MEMBER)
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Obtiene un usuario específico. Los permisos se verifican según el rol',
  })
  @ApiResponse({ status: 200, description: 'Usuario encontrado', type: GetUserResponseDto })
  @ApiResponse({ status: 400, description: 'Formato de ID inválido' })
  @ApiResponse({ status: 403, description: 'No tiene permisos para ver este usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones. Intenta nuevamente más tarde.' })
  async getById(
    @Param('id', CuidValidationPipe) id: string,
    @CurrentUser() currentUser: UserEntity
  ): Promise<GetUserResponseDto> {
    return await this.getUserUseCase.execute(id, currentUser);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza los datos de un usuario. SUPER_ADMIN puede actualizar todos excepto otros SUPER_ADMIN. ADMIN puede actualizar todos excepto SUPER_ADMIN.',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado correctamente', type: UpdateUserResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 403, description: 'No tiene permisos para actualizar este usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones. Intenta nuevamente más tarde.' })
  async update(
    @Param('id', CuidValidationPipe) id: string,
    @Body() dto: UpdateUserRequestDto,
    @CurrentUser() currentUser: UserEntity
  ): Promise<UpdateUserResponseDto> {
    return await this.updateUserUseCase.execute(id, dto, currentUser);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Cambiar estado de usuario',
    description:
      'Cambia el estado de un usuario (ACTIVE, INACTIVE, SUSPENDED). ' +
      'SUPER_ADMIN puede cambiar el estado de cualquier usuario excepto otros SUPER_ADMIN. ' +
      'ADMIN solo puede cambiar el estado de usuarios de cuentas de clientes. ' +
      'No se puede cambiar el estado de usuarios con rol SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: UpdateUserStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Formato de ID inválido o datos inválidos' })
  @ApiResponse({ status: 403, description: 'No tiene permisos para cambiar el estado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones. Intenta nuevamente más tarde.' })
  async updateStatus(
    @Param('id', CuidValidationPipe) id: string,
    @Body() dto: UpdateUserStatusRequestDto,
    @CurrentUser() currentUser: UserEntity
  ): Promise<UpdateUserStatusResponseDto> {
    return await this.updateUserStatusUseCase.execute(id, dto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar usuario',
    description:
      'Elimina un usuario del sistema. ' +
      'SUPER_ADMIN puede eliminar cualquier usuario excepto a sí mismo, otros SUPER_ADMIN y propietarios de cuentas. ' +
      'ADMIN solo puede eliminar usuarios de cuentas de clientes. ' +
      'No se puede eliminar a usuarios con rol SUPER_ADMIN ni ACCOUNT_OWNER.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado exitosamente',
    type: DeleteUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Formato de ID inválido o no se puede eliminar' })
  @ApiResponse({ status: 403, description: 'No tiene permisos para eliminar usuarios' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 429, description: 'Demasiadas peticiones. Intenta nuevamente más tarde.' })
  async delete(
    @Param('id', CuidValidationPipe) id: string,
    @CurrentUser() currentUser: UserEntity
  ): Promise<DeleteUserResponseDto> {
    return await this.deleteUserUseCase.execute(id, currentUser);
  }
}
