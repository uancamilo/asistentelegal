import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Reduced logging for cleaner console output in development
      log: process.env['NODE_ENV'] === 'development'
        ? ['warn', 'error']
        : ['warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.connect();

    // Log queries in development for N+1 detection (DISABLED to reduce log noise)
    // if (process.env['NODE_ENV'] === 'development') {
    //   (this.$on as any)('query', (e: any) => {
    //     this.logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
    //   });
    // }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Connect to database with retry logic for Neon cold starts
   */
  private async connect(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000; // 1 second

    while (attempts < maxAttempts) {
      try {
        await this.$connect();
        this.logger.log('✅ Database connected successfully');
        return;
      } catch (error: any) {
        attempts++;
        this.logger.warn(
          `⚠️ Connection attempt ${attempts}/${maxAttempts} failed${
            attempts < maxAttempts ? ', retrying...' : ''
          }`
        );

        if (attempts < maxAttempts) {
          // Exponential backoff: wait longer after each failed attempt
          const delay = baseDelay * Math.pow(2, attempts - 1);
          await this.sleep(delay);
        } else {
          this.logger.error('❌ Failed to connect to database after multiple attempts:', error);
          throw error;
        }
      }
    }
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check to verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }
}
