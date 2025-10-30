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

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    UserModule, // Para acceder a USER_REPOSITORY
  ],
  controllers: [AuthController],
  providers: [LoginUseCase, RefreshTokenUseCase, LogoutUseCase, CustomJwtService, JwtStrategy, JwtRefreshStrategy],
  exports: [CustomJwtService],
})
export class AuthModule {}
