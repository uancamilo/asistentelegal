import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  tokenVersion: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Genera un par de tokens (access + refresh)
   */
  async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Genera un access token (corta duración)
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload as Record<string, any>);
  }

  /**
   * Genera un refresh token (larga duración)
   */
  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload as Record<string, any>, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
    } as any);
  }

  /**
   * Verifica y decodifica un access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
    });
  }

  /**
   * Verifica y decodifica un refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
    });
  }
}
