import { Module, Global } from '@nestjs/common';
import { UserThrottlerGuard } from './UserThrottler.guard';

/**
 * Global module that provides reusable guards across the application
 *
 * UserThrottlerGuard extends ThrottlerGuard and requires:
 * - THROTTLER:MODULE_OPTIONS (from ThrottlerModule.forRoot() in AppModule)
 * - ThrottlerStorage (from ThrottlerModule.forRoot() in AppModule)
 * - Reflector (resolved automatically by NestJS from @nestjs/core)
 *
 * Note: ThrottlerModule is already configured globally in AppModule with .forRoot(),
 * and Reflector is a built-in NestJS class that should be auto-resolvable.
 *
 * This module is marked as @Global() so UserThrottlerGuard is available everywhere.
 */
@Global()
@Module({
  providers: [UserThrottlerGuard],
  exports: [UserThrottlerGuard],
})
export class GuardsModule {}
