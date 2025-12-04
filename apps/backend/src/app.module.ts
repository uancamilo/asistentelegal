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
import { AssistantModule } from './modules/assistant/assistant.module';
import { AuditModule } from './shared/audit/audit.module';
import { RateLimitingModule } from './shared/rate-limiting/rate-limiting.module';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import { validate } from './config/env.validation';
import { ContentTypeValidationMiddleware } from './shared/middleware/content-type-validation.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig],
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: process.env['NODE_ENV'] === 'test' ? 1 : 60000,
        limit: process.env['NODE_ENV'] === 'test' ? 5 : 5,
      },
    ]),
    PrismaModule,
    AuthModule,
    UserModule,
    AccountModule,
    InvitationModule,
    DocumentModule,
    SearchModule,
    AssistantModule,
    AuditModule,
    RateLimitingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ContentTypeValidationMiddleware)
      .forRoutes('*');
  }
}
