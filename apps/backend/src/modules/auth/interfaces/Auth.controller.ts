import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Res, Req, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginUseCase } from '../application/use-cases/Login.usecase';
import { RefreshTokenUseCase } from '../application/use-cases/RefreshToken.usecase';
import { LogoutUseCase } from '../application/use-cases/Logout.usecase';
import { LoginRequestDto, LoginResponseDto } from '../application/dtos/Login.dto';
import { RefreshTokenResponseDto } from '../application/dtos/RefreshToken.dto';
import { LogoutResponseDto } from '../application/dtos/Logout.dto';
import { JwtAuthGuard } from '../../../shared/guards/JwtAuth.guard';
import { CsrfGuard } from '../../../shared/guards/Csrf.guard';
import { AuthRateLimitGuard } from '../../../shared/rate-limiting/auth-rate-limit.guard';
import { CurrentUser } from '../../../shared/decorators/CurrentUser.decorator';
import { UserEntity } from '../../user/domain/entities/User.entity';

@ApiTags('auth')
@Controller('auth')
@UseGuards(CsrfGuard) // Protección global contra CSRF
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase
  ) {}

  /**
   * Endpoint de login con protección contra fuerza bruta
   * Límite Redis: 3 intentos por email / 5 minutos, 5 intentos por IP / 5 minutos
   * Tokens almacenados en HttpOnly cookies para prevenir XSS
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @ApiOperation({
    summary: 'Login de usuario',
    description: 'Autentica un usuario y almacena tokens JWT en HttpOnly cookies',
  })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de login. Intenta nuevamente más tarde.',
  })
  async login(@Body() loginDto: LoginRequestDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<Omit<LoginResponseDto, 'accessToken' | 'refreshToken'>> {
    // Extract IP and user-agent for audit logging
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.loginUseCase.execute(loginDto, ipAddress, userAgent);

    // Establecer tokens como HttpOnly cookies con configuración segura
    // SECURITY: Use sameSite 'strict' in production, 'lax' in development
    // Development uses 'lax' to allow cookies between localhost:3000 (frontend) and localhost:8080 (backend)
    // For development with HTTPS, set COOKIE_SECURE=true in .env
    const isProduction = process.env['NODE_ENV'] === 'production';
    const cookieSecure = process.env['COOKIE_SECURE'] === 'true' || isProduction;
    const sameSitePolicy = isProduction ? 'strict' : 'lax';

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: sameSitePolicy,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutos
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: sameSitePolicy,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    // Retornar solo datos del usuario sin tokens
    return { user: result.user };
  }

  /**
   * Endpoint de refresh con límite más flexible
   * Límite Redis: 5 intentos por IP / 5 minutos
   * Lee refresh token desde HttpOnly cookie
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Renovar tokens',
    description: 'Renueva los tokens usando el refresh token almacenado en HttpOnly cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados exitosamente',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de renovación. Intenta nuevamente más tarde.',
  })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    // Extract IP and user-agent for audit logging
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.refreshTokenUseCase.execute({ refreshToken }, ipAddress, userAgent);

    // Establecer nuevos tokens como HttpOnly cookies con configuración segura
    const isProduction = process.env['NODE_ENV'] === 'production';
    const cookieSecure = process.env['COOKIE_SECURE'] === 'true' || isProduction;
    const sameSitePolicy = isProduction ? 'strict' : 'lax';

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: sameSitePolicy,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutos
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: sameSitePolicy,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    return { message: 'Tokens renewed successfully' };
  }

  /**
   * Endpoint de logout con revocación de tokens
   * Límite: 5 intentos cada 60 segundos por IP (configuración global)
   * Requiere autenticación JWT y limpia HttpOnly cookies
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout de usuario',
    description: 'Invalida todos los tokens del usuario incrementando su tokenVersion y limpia cookies',
  })
  @ApiResponse({ status: 200, description: 'Logout exitoso', type: LogoutResponseDto })
  @ApiResponse({ status: 401, description: 'No autenticado o token inválido' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de logout. Intenta nuevamente más tarde.',
  })
  async logout(@CurrentUser() user: UserEntity, @Res({ passthrough: true }) res: Response): Promise<LogoutResponseDto> {
    const result = await this.logoutUseCase.execute(user.id);

    // Limpiar cookies con las mismas opciones usadas al crearlas
    const isProduction = process.env['NODE_ENV'] === 'production';
    const cookieSecure = process.env['COOKIE_SECURE'] === 'true' || isProduction;
    const sameSitePolicy = isProduction ? 'strict' : 'lax';

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: sameSitePolicy,
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: sameSitePolicy,
      path: '/',
    });

    return result;
  }

  /**
   * Endpoint de validación de sesión
   * Verifica si el token actual es válido y retorna los datos del usuario
   *
   * SECURITY FIX (P3.3): Reduced rate limit to prevent token enumeration
   * - 3 req/60s (reduced from 10) to prevent abuse
   * - Protects against brute force token validation attacks
   *
   * Requiere autenticación JWT
   */
  @Get('validate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // SECURITY FIX P3.3: 3 req/60s
  @ApiOperation({
    summary: 'Validar sesión actual',
    description: 'Verifica que el token JWT sea válido y retorna los datos actuales del usuario',
  })
  @ApiResponse({ status: 200, description: 'Token válido - retorna datos del usuario' })
  @ApiResponse({ status: 401, description: 'Token inválido, expirado o usuario inactivo' })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de validación. Intenta nuevamente más tarde.',
  })
  async validate(@CurrentUser() user: UserEntity) {
    // El JwtAuthGuard ya validó el token y el usuario
    // Solo retornamos los datos del usuario actual
    return {
      id: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    };
  }
}
