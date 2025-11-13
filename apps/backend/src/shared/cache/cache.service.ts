import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis-based caching service for high-frequency data access
 *
 * Primary use case: Cache authenticated user lookups during JWT validation
 * to reduce database load and improve response times.
 *
 * TTL Strategy:
 * - User cache: 15 minutes (aligned with access token lifespan)
 * - Invalidation: On user updates, logouts, or role changes
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private readonly enabled: boolean;
  private readonly USER_CACHE_TTL = 15 * 60; // 15 minutes in seconds

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.enabled = !!redisUrl && process.env['NODE_ENV'] !== 'test';

    if (this.enabled && redisUrl) {
      this.redisClient = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          this.logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      this.redisClient.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis cache connected successfully');
      });
    } else {
      this.logger.warn('Redis cache disabled (no REDIS_URL or test environment)');
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis cache connection closed');
    }
  }

  /**
   * Cache user data by ID with automatic TTL
   */
  async cacheUser(userId: string, userData: Record<string, any>): Promise<void> {
    if (!this.enabled || !this.redisClient) {
      return;
    }

    try {
      const key = this.getUserCacheKey(userId);
      await this.redisClient.setex(key, this.USER_CACHE_TTL, JSON.stringify(userData));
      this.logger.debug(`User ${userId} cached for ${this.USER_CACHE_TTL}s`);
    } catch (error) {
      this.logger.error(`Failed to cache user ${userId}:`, error);
      // Non-blocking: cache failures don't break application flow
    }
  }

  /**
   * Retrieve cached user data by ID
   */
  async getCachedUser(userId: string): Promise<Record<string, any> | null> {
    if (!this.enabled || !this.redisClient) {
      return null;
    }

    try {
      const key = this.getUserCacheKey(userId);
      const cached = await this.redisClient.get(key);

      if (cached) {
        this.logger.debug(`Cache HIT for user ${userId}`);
        return JSON.parse(cached);
      }

      this.logger.debug(`Cache MISS for user ${userId}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to retrieve cached user ${userId}:`, error);
      return null; // Fail gracefully
    }
  }

  /**
   * Invalidate cached user data (on updates, logout, role changes)
   */
  async invalidateUser(userId: string): Promise<void> {
    if (!this.enabled || !this.redisClient) {
      return;
    }

    try {
      const key = this.getUserCacheKey(userId);
      await this.redisClient.del(key);
      this.logger.debug(`User ${userId} cache invalidated`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user ${userId}:`, error);
    }
  }

  /**
   * Invalidate multiple users at once (batch operation)
   */
  async invalidateUsers(userIds: string[]): Promise<void> {
    if (!this.enabled || !this.redisClient || userIds.length === 0) {
      return;
    }

    try {
      const keys = userIds.map((id) => this.getUserCacheKey(id));
      await this.redisClient.del(...keys);
      this.logger.debug(`Invalidated ${userIds.length} user caches`);
    } catch (error) {
      this.logger.error('Failed to invalidate multiple users:', error);
    }
  }

  /**
   * Generate consistent cache key for user data
   */
  private getUserCacheKey(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Check if cache is enabled and ready
   */
  isEnabled(): boolean {
    return this.enabled && this.redisClient !== null;
  }
}
