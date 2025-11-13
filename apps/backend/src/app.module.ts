import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AccountModule } from './modules/account/account.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { DocumentModule } from './modules/document/document.module';
import { SearchModule } from './modules/search/search.module';
import { AuditModule } from './shared/audit/audit.module';
import { RateLimitingModule } from './shared/rate-limiting/rate-limiting.module';
// import { GuardsModule } from './shared/guards/guards.module'; // TODO: Fix UserThrottlerGuard DI
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import { validate } from './config/env.validation';
import { ContentTypeValidationMiddleware } from './shared/middleware/content-type-validation.middleware';

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
        limit: process.env['NODE_ENV'] === 'test' ? 5 : 5, // Test: 5 req/ms | Prod: 5 req/60s
      },
    ]),
    // Módulo global de Prisma
    PrismaModule,
    // TODO: Add GuardsModule back after fixing UserThrottlerGuard DI
    // Módulos de dominio
    AuthModule,
    UserModule,
    AccountModule,
    InvitationModule,
    DocumentModule,
    SearchModule,
    AuditModule,
    // Módulo de rate limiting con Redis
    RateLimitingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  /**
   * Configure global middleware
   *
   * SECURITY FIX (P3.5): Content-Type validation for all routes
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ContentTypeValidationMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
