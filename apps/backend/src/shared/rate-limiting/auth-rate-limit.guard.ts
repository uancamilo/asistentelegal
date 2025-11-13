import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { RedisRateLimiterService } from './redis-rate-limiter.service';

/**
 * Rate limit guard for authentication endpoints
 * Implements combined IP + email rate limiting to prevent credential stuffing
 *
 * Rate limits:
 * - 3 attempts per email per 5 minutes (300000ms)
 * - 5 attempts per IP per 5 minutes (300000ms)
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly EMAIL_LIMIT = 3;
  private readonly IP_LIMIT = 5;
  private readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly rateLimiterService: RedisRateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const body = request.body as { email?: string };
    const email = body?.email;

    // Check IP-based rate limit
    const ipKey = `ip:${ip}`;
    const ipResult = await this.rateLimiterService.checkRateLimit(
      ipKey,
      this.IP_LIMIT,
      this.WINDOW_MS
    );

    if (!ipResult.allowed) {
      const retryAfter = Math.ceil((ipResult.resetTime - Date.now()) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests from this IP. Please try again in ${retryAfter} seconds.`,
          error: 'Too Many Requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // If email is provided, check email-based rate limit
    if (email) {
      const emailKey = `email:${email.toLowerCase()}`;
      const emailResult = await this.rateLimiterService.checkRateLimit(
        emailKey,
        this.EMAIL_LIMIT,
        this.WINDOW_MS
      );

      if (!emailResult.allowed) {
        const retryAfter = Math.ceil((emailResult.resetTime - Date.now()) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Too many login attempts for this account. Please try again in ${retryAfter} seconds.`,
            error: 'Too Many Requests',
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    return true;
  }
}
