import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../user/domain/constants/tokens';
import { IUserRepository } from '../../../user/domain/interfaces/IUserRepository';
import { JwtService } from '../../infrastructure/services/Jwt.service';
import { RefreshTokenRequestDto, RefreshTokenResponseDto } from '../dtos/RefreshToken.dto';
import { UserStatus } from '../../../user/domain/entities/User.entity';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService
  ) {}

  async execute(dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    // 1. Verificar el refresh token
    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Verificar que el usuario esté activo
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    // 4. Generar nuevo par de tokens
    const tokens = await this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email.getValue(),
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    // 5. Retornar nuevos tokens
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
