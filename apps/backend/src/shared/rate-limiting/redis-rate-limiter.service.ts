import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
}

/**
 * Redis-based distributed rate limiter service
 * Tracks rate limits using Redis with sliding window algorithm
 */
@Injectable()
export class RedisRateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisRateLimiterService.name);
  private redisClient: Redis | null = null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    // Check if Redis is configured
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.enabled = !!redisUrl && process.env['NODE_ENV'] !== 'test';

    if (this.enabled && redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl, {
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        this.redisClient.on('error', (error) => {
          this.logger.error(`Redis connection error: ${error.message}`);
        });

        this.redisClient.on('connect', () => {
          this.logger.log('Redis connected successfully');
        });
      } catch (error) {
        this.logger.error(`Failed to initialize Redis: ${error}`);
        this.enabled = false;
      }
    } else {
      this.logger.warn('Redis rate limiting disabled (no REDIS_URL or test environment)');
    }
  }

  /**
   * Check if request is rate limited
   * @param key - Unique identifier for the rate limit (IP + email combination)
   * @param limit - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   * @returns RateLimitResult
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitResult> {
    // If Redis is not enabled, allow all requests (fallback to in-memory throttler)
    if (!this.enabled || !this.redisClient) {
      return {
        allowed: true,
        remainingAttempts: limit,
        resetTime: Date.now() + windowMs,
      };
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rate-limit:${key}`;

    try {
      // Use Redis sorted set for sliding window
      // Remove old entries outside the window
      await this.redisClient.zremrangebyscore(redisKey, 0, windowStart);

      // Count current requests in window
      const count = await this.redisClient.zcard(redisKey);

      if (count >= limit) {
        // Get oldest entry to determine reset time
        const oldest = await this.redisClient.zrange(redisKey, 0, 0, 'WITHSCORES');
        const resetTime = oldest.length > 1 && oldest[1] ? parseInt(oldest[1]) + windowMs : now + windowMs;

        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime,
        };
      }

      // Add current request
      await this.redisClient.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiration on the key
      await this.redisClient.expire(redisKey, Math.ceil(windowMs / 1000));

      return {
        allowed: true,
        remainingAttempts: limit - count - 1,
        resetTime: now + windowMs,
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed: ${error}`, error instanceof Error ? error.stack : undefined);
      // On error, allow the request (fail open for rate limiting)
      return {
        allowed: true,
        remainingAttempts: limit,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param key - The key to reset
   */
  async resetRateLimit(key: string): Promise<void> {
    if (!this.enabled || !this.redisClient) {
      return;
    }

    try {
      await this.redisClient.del(`rate-limit:${key}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit: ${error}`);
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
