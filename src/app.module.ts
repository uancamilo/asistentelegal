import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig],
      validate,
    }),
    // Configuración de parámetros por defecto para rate limiting
    // IMPORTANTE: Esta configuración NO aplica el ThrottlerGuard automáticamente.
    // Los controladores deben usar explícitamente @UseGuards(ThrottlerGuard)
    // para activar la protección contra ataques de fuerza bruta y DoS.
    //
    // Parámetros por defecto: 5 requests por IP cada 60 segundos
    // Los endpoints individuales pueden sobrescribir este límite con @Throttle()
    //
    // Controladores protegidos actualmente:
    // - AuthController: 5 req/60s (login), 10 req/60s (refresh)
    // - UserController: 30 req/60s (todos los endpoints)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 segundos (en milisegundos para @nestjs/throttler v6+)
        limit: 5,   // máximo 5 requests por IP (parámetro por defecto)
      },
    ]),
    // Módulo global de Prisma
    PrismaModule,
    // Módulos de dominio
    AuthModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
