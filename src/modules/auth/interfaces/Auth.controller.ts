import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LoginUseCase } from '../application/use-cases/Login.usecase';
import { RefreshTokenUseCase } from '../application/use-cases/RefreshToken.usecase';
import { LoginRequestDto, LoginResponseDto } from '../application/dtos/Login.dto';
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from '../application/dtos/RefreshToken.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase
  ) {}

  /**
   * Endpoint de login con protección contra fuerza bruta
   * Límite: 5 intentos cada 60 segundos por IP (configuración global)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuario', description: 'Autentica un usuario y retorna tokens JWT' })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos de login. Intenta nuevamente más tarde.' })
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    return await this.loginUseCase.execute(loginDto);
  }

  /**
   * Endpoint de refresh con límite más flexible
   * Límite: 10 intentos cada 60 segundos por IP
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Renovar tokens',
    description: 'Renueva los tokens usando un refresh token válido enviado en el body',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados exitosamente', type: RefreshTokenResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos de renovación. Intenta nuevamente más tarde.' })
  async refresh(@Body() dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    return await this.refreshTokenUseCase.execute(dto);
  }
}
