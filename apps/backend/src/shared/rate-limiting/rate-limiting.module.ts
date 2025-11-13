import { Module } from '@nestjs/common';
import { RedisRateLimiterService } from './redis-rate-limiter.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { RedisThrottlerGuard } from './redis-throttler.guard';

@Module({
  providers: [RedisRateLimiterService, AuthRateLimitGuard, RedisThrottlerGuard],
  exports: [RedisRateLimiterService, AuthRateLimitGuard, RedisThrottlerGuard],
})
export class RateLimitingModule {}
