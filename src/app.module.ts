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
    //
    // NOTA: En entorno de test, el rate limiting está relajado para evitar fallos en la suite de Jest
    ThrottlerModule.forRoot([
      {
        ttl: process.env['NODE_ENV'] === 'test' ? 1 : 60000, // Test: 1ms | Prod: 60s
        limit: process.env['NODE_ENV'] === 'test' ? 5 : 5,    // Test: 5 req/ms | Prod: 5 req/60s
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
