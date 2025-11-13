import { Injectable, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisRateLimiterService } from './redis-rate-limiter.service';

/**
 * Redis-based distributed throttler guard
 *
 * Replaces @nestjs/throttler ThrottlerGuard with Redis-backed rate limiting
 * for consistent throttling across horizontally-scaled instances.
 *
 * Usage:
 * - Apply at controller or route level
 * - Configurable via @Throttle decorator or class-level defaults
 * - Falls back to permissive behavior if Redis unavailable (non-blocking)
 *
 * Rate limiting strategy:
 * - IP-based throttling (prevents abuse from single source)
 * - Configurable limits per endpoint
 * - Sliding window algorithm for precise rate control
 */
@Injectable()
export class RedisThrottlerGuard {
  private readonly logger = new Logger(RedisThrottlerGuard.name);

  // Default limits (can be overridden via @Throttle decorator)
  private readonly DEFAULT_LIMIT = 30;
  private readonly DEFAULT_WINDOW_MS = 60000; // 1 minute

  constructor(
    private readonly rateLimiter: RedisRateLimiterService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract rate limit configuration from @Throttle decorator
    const throttleOptions = this.reflector.get<{ default?: { limit: number; ttl: number } }>(
      'throttle',
      context.getHandler()
    );

    const limit = throttleOptions?.default?.limit || this.DEFAULT_LIMIT;
    const windowMs = throttleOptions?.default?.ttl || this.DEFAULT_WINDOW_MS;

    // Build rate limit key based on IP + route
    const ipAddress = this.extractIpAddress(request);
    const route = request.route?.path || request.path;
    const key = `throttle:${ipAddress}:${route}`;

    // Check rate limit
    const result = await this.rateLimiter.checkRateLimit(key, limit, windowMs);

    if (!result.allowed) {
      this.logger.warn(
        `Rate limit exceeded for IP ${ipAddress} on ${route} (${limit} requests per ${windowMs}ms)`
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  /**
   * Extract IP address from request (supports proxies)
   */
  private extractIpAddress(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];

    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0]?.trim() || request.ip || 'unknown';
    }

    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
