import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../shared/guards/JwtAuth.guard';
import { RolesGuard } from '../../../../shared/guards/Roles.guard';
import { CsrfGuard } from '../../../../shared/guards/Csrf.guard';
import { RedisThrottlerGuard } from '../../../../shared/rate-limiting/redis-throttler.guard';
import { Roles } from '../../../../shared/decorators/Roles.decorator';
import { CurrentUser } from '../../../../shared/decorators/CurrentUser.decorator';
import { Role } from '../../../user/domain/entities/User.entity';
import { UserEntity } from '../../../user/domain/entities/User.entity';
import { CuidValidationPipe } from '../../../../shared/pipes/cuid-validation.pipe';

// Use Cases
import { CreateAccountUseCase } from '../../application/use-cases/CreateAccount/CreateAccount.use-case';
import { ListAccountsUseCase } from '../../application/use-cases/ListAccounts/ListAccounts.use-case';
import { GetAccountUseCase } from '../../application/use-cases/GetAccount/GetAccount.use-case';
import { UpdateAccountUseCase } from '../../application/use-cases/UpdateAccount/UpdateAccount.use-case';
import { DeleteAccountUseCase } from '../../application/use-cases/DeleteAccount/DeleteAccount.use-case';
import { GetAccountUsersUseCase } from '../../application/use-cases/GetAccountUsers/GetAccountUsers.use-case';

// DTOs
import {
  CreateAccountRequestDto,
  CreateAccountResponseDto,
} from '../../application/use-cases/CreateAccount/CreateAccount.dto';
import { ListAccountsResponseDto } from '../../application/use-cases/ListAccounts/ListAccounts.dto';
import { GetAccountResponseDto } from '../../application/use-cases/GetAccount/GetAccount.dto';
import {
  UpdateAccountRequestDto,
  UpdateAccountResponseDto,
} from '../../application/use-cases/UpdateAccount/UpdateAccount.dto';
import { DeleteAccountResponseDto } from '../../application/use-cases/DeleteAccount/DeleteAccount.dto';
import { GetAccountUsersResponseDto } from '../../application/use-cases/GetAccountUsers/GetAccountUsers.dto';

/**
 * Controller para gestión de cuentas (Accounts)
 *
 * Reglas de seguridad:
 * - Todos los endpoints requieren autenticación JWT
 * - Rate limiting por usuario autenticado: 30 req/min (DELETE: 10 req/min)
 * - ADMIN nunca puede acceder a cuentas del sistema (isSystemAccount = true)
 * - Solo SUPER_ADMIN puede eliminar cuentas
 */
@ApiTags('Accounts')
@ApiBearerAuth('JWT-auth')
@Controller('accounts')
@Throttle({ default: { limit: 30, ttl: 60000 } })
@UseGuards(RedisThrottlerGuard, CsrfGuard, JwtAuthGuard, RolesGuard) // Redis-based distributed rate limiting
export class AccountController {
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly listAccountsUseCase: ListAccountsUseCase,
    private readonly getAccountUseCase: GetAccountUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    private readonly getAccountUsersUseCase: GetAccountUsersUseCase
  ) {}

  /**
   * POST /api/accounts - Crear nueva cuenta de cliente
   *
   * Permisos: SUPER_ADMIN, ADMIN
   * Rate limit: 30 req/min
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Crear nueva cuenta de cliente',
    description:
      'Crea una nueva cuenta de cliente. Solo SUPER_ADMIN y ADMIN pueden crear cuentas. ' +
      'Las cuentas siempre se crean con isSystemAccount=false (no se puede crear cuentas del sistema desde la API).',
  })
  @ApiResponse({
    status: 201,
    description: 'Cuenta creada exitosamente',
    type: CreateAccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes (solo SUPER_ADMIN o ADMIN)',
  })
  @ApiResponse({ status: 404, description: 'Usuario propietario no encontrado' })
  @ApiResponse({ status: 409, description: 'El nombre de cuenta ya existe' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
  })
  async createAccount(
    @Body() dto: CreateAccountRequestDto,
    @CurrentUser() currentUser: UserEntity
  ): Promise<CreateAccountResponseDto> {
    return await this.createAccountUseCase.execute(dto, currentUser);
  }

  /**
   * GET /api/accounts - Listar cuentas según permisos
   *
   * Permisos: SUPER_ADMIN, ADMIN
   * Rate limit: 30 req/min
   *
   * Filtrado:
   * - SUPER_ADMIN: ve todas las cuentas (incluida Employees)
   * - ADMIN: solo ve cuentas de clientes (sin Employees ni cuentas del sistema)
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Listar cuentas según permisos del usuario',
    description:
      'Lista cuentas basado en el rol del usuario. ' +
      'SUPER_ADMIN ve todas las cuentas incluida Employees. ' +
      'ADMIN solo ve cuentas de clientes (isSystemAccount=false). ' +
      'Soporta paginación con limit y offset.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cuentas obtenida exitosamente',
    type: ListAccountsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes (solo SUPER_ADMIN o ADMIN)',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
  })
  async listAccounts(
    @CurrentUser() currentUser: UserEntity,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ListAccountsResponseDto> {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 50; // Max 100 por petición
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return await this.listAccountsUseCase.execute(currentUser, parsedLimit, parsedOffset);
  }

  /**
   * GET /api/accounts/:id/users - Obtener usuarios de una cuenta
   *
   * Permisos: SUPER_ADMIN, ADMIN, ACCOUNT_OWNER
   * Rate limit: 30 req/min
   *
   * Autorización:
   * - SUPER_ADMIN: puede ver usuarios de cualquier cuenta (incluida EMPLEADOS)
   * - ADMIN: solo usuarios de cuentas de clientes (sin EMPLEADOS)
   * - ACCOUNT_OWNER: solo usuarios de su propia cuenta
   */
  @Get(':id/users')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER)
  @ApiOperation({
    summary: 'Obtener usuarios de una cuenta',
    description:
      'Lista todos los usuarios que pertenecen a una cuenta. ' +
      'SUPER_ADMIN puede ver usuarios de cualquier cuenta incluida EMPLEADOS. ' +
      'ADMIN solo puede ver usuarios de cuentas de clientes. ' +
      'ACCOUNT_OWNER solo puede ver usuarios de su propia cuenta.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cuenta',
    type: String,
    example: 'acc_clwxyz123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    type: GetAccountUsersResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Formato de ID inválido' })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes o intento de acceder a cuenta del sistema siendo ADMIN',
  })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
  })
  async getAccountUsers(
    @Param('id', CuidValidationPipe) accountId: string,
    @CurrentUser() currentUser: UserEntity
  ): Promise<GetAccountUsersResponseDto> {
    return await this.getAccountUsersUseCase.execute(accountId, currentUser);
  }

  /**
   * GET /api/accounts/:id - Obtener cuenta por ID
   *
   * Permisos: SUPER_ADMIN, ADMIN, ACCOUNT_OWNER
   * Rate limit: 30 req/min
   *
   * Autorización:
   * - SUPER_ADMIN: puede ver cualquier cuenta
   * - ADMIN: solo cuentas de clientes (sin Employees)
   * - ACCOUNT_OWNER: solo su propia cuenta
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER)
  @ApiOperation({
    summary: 'Obtener cuenta por ID',
    description:
      'Obtiene una cuenta específica. ' +
      'SUPER_ADMIN puede ver cualquier cuenta. ' +
      'ADMIN solo puede ver cuentas de clientes. ' +
      'ACCOUNT_OWNER solo puede ver su propia cuenta.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cuenta (CUID)',
    type: String,
    example: 'acc_clwxyz123',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta obtenida exitosamente',
    type: GetAccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Formato de ID inválido' })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes o intento de acceder a cuenta del sistema siendo ADMIN',
  })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
  })
  async getAccount(
    @Param('id', CuidValidationPipe) accountId: string,
    @CurrentUser() currentUser: UserEntity
  ): Promise<GetAccountResponseDto> {
    return await this.getAccountUseCase.execute(accountId, currentUser);
  }

  /**
   * PATCH /api/accounts/:id - Actualizar cuenta
   *
   * Permisos: SUPER_ADMIN, ADMIN, ACCOUNT_OWNER
   * Rate limit: 30 req/min
   *
   * Autorización:
   * - SUPER_ADMIN: puede editar cualquier cuenta (incluida Employees)
   * - ADMIN: solo cuentas de clientes (sin Employees)
   * - ACCOUNT_OWNER: solo su propia cuenta
   *
   * IMPORTANTE: No se puede cambiar isSystemAccount desde la API
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER)
  @ApiOperation({
    summary: 'Actualizar información de cuenta',
    description:
      'Actualiza el nombre de una cuenta. ' +
      'SUPER_ADMIN puede editar cualquier cuenta incluida Employees (cuentas del sistema). ' +
      'ADMIN solo puede editar cuentas de clientes (no puede editar cuentas del sistema). ' +
      'ACCOUNT_OWNER solo puede editar su propia cuenta (no puede editar cuentas del sistema). ' +
      'NOTA: No se puede cambiar isSystemAccount.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cuenta a actualizar',
    type: String,
    example: 'acc_clwxyz123',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta actualizada exitosamente',
    type: UpdateAccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o formato de ID inválido' })
  @ApiResponse({
    status: 403,
    description:
      'Permisos insuficientes. ADMIN/ACCOUNT_OWNER no pueden modificar cuentas del sistema (solo SUPER_ADMIN puede hacerlo).',
  })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'El nuevo nombre de cuenta ya existe',
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
  })
  async updateAccount(
    @Param('id', CuidValidationPipe) accountId: string,
    @Body() dto: UpdateAccountRequestDto,
    @CurrentUser() currentUser: UserEntity
  ): Promise<UpdateAccountResponseDto> {
    return await this.updateAccountUseCase.execute(accountId, dto, currentUser);
  }

  /**
   * DELETE /api/accounts/:id - Eliminar cuenta
   *
   * Permisos: SOLO SUPER_ADMIN
   * Rate limit: 10 req/min (más restrictivo)
   *
   * Validaciones:
   * - No se pueden eliminar cuentas del sistema (isSystemAccount=true)
   * - No se pueden eliminar cuentas con usuarios activos
   * - Solo SUPER_ADMIN puede ejecutar este endpoint
   */
  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Eliminar cuenta (SUPER_ADMIN únicamente)',
    description:
      'Elimina permanentemente una cuenta. ' +
      'Solo SUPER_ADMIN puede eliminar cuentas. ' +
      'No se pueden eliminar: cuentas del sistema (Employees) ni cuentas con usuarios activos.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cuenta a eliminar',
    type: String,
    example: 'acc_clwxyz123',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta eliminada exitosamente',
    type: DeleteAccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Formato de ID inválido' })
  @ApiResponse({
    status: 403,
    description:
      'Permisos insuficientes (solo SUPER_ADMIN) o intento de eliminar cuenta del sistema o cuenta con usuarios activos',
  })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({
    status: 429,
    description: 'Demasiadas peticiones. Intenta nuevamente más tarde.',
  })
  async deleteAccount(
    @Param('id', CuidValidationPipe) accountId: string,
    @CurrentUser() currentUser: UserEntity
  ): Promise<DeleteAccountResponseDto> {
    return await this.deleteAccountUseCase.execute(accountId, currentUser);
  }
}
