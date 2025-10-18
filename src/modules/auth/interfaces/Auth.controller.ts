import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginUseCase } from '../application/use-cases/Login.usecase';
import { RefreshTokenUseCase } from '../application/use-cases/RefreshToken.usecase';
import { LoginRequestDto, LoginResponseDto } from '../application/dtos/Login.dto';
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from '../application/dtos/RefreshToken.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuario', description: 'Autentica un usuario y retorna tokens JWT' })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    return await this.loginUseCase.execute(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar tokens',
    description: 'Renueva los tokens usando un refresh token válido enviado en el body',
  })
  @ApiResponse({ status: 200, description: 'Tokens renovados exitosamente', type: RefreshTokenResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refresh(@Body() dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    return await this.refreshTokenUseCase.execute(dto);
  }
}
