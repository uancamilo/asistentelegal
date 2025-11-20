import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './interfaces/Auth.controller';
import { LoginUseCase } from './application/use-cases/Login.usecase';
import { RefreshTokenUseCase } from './application/use-cases/RefreshToken.usecase';
import { LogoutUseCase } from './application/use-cases/Logout.usecase';
import { JwtService as CustomJwtService } from './infrastructure/services/Jwt.service';
import { JwtStrategy } from './infrastructure/strategies/Jwt.strategy';
import { JwtRefreshStrategy } from './infrastructure/strategies/JwtRefresh.strategy';
import { UserModule } from '../user/user.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { AuditModule } from '../../shared/audit/audit.module';
import { RateLimitingModule } from '../../shared/rate-limiting/rate-limiting.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const expiresIn = configService.getOrThrow<string>('jwt.expiresIn');
        return {
          secret: configService.getOrThrow<string>('jwt.secret'),
          signOptions: {
            expiresIn: expiresIn as any, // Cast to avoid type error with string literals
          },
        };
      },
      inject: [ConfigService],
    }),
    UserModule, // Para acceder a USER_REPOSITORY
    CacheModule, // Redis-based caching for user sessions
    AuditModule, // Para acceder a AuditService
    RateLimitingModule, // Para acceder a RedisRateLimiterService y guards
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    CustomJwtService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [CustomJwtService],
})
export class AuthModule {}
