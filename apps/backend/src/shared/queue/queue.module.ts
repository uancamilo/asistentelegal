import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DOCUMENT_PROCESSING_QUEUE } from './queue.constants';

/**
 * QueueModule
 *
 * Provides BullMQ infrastructure for async job processing.
 * Uses Redis connection from REDIS_URL environment variable.
 *
 * Usage:
 * - Import QueueModule in feature modules that need to enqueue jobs
 * - Register processors in their respective feature modules
 */
@Module({
  imports: [
    // Register BullMQ with Redis connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');

        // Parse Redis URL
        const url = new URL(redisUrl);

        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            // TLS for production Redis (e.g., Redis Cloud, Upstash)
            ...(url.protocol === 'rediss:' && {
              tls: {
                rejectUnauthorized: false,
              },
            }),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        };
      },
    }),

    // Register document-processing queue
    BullModule.registerQueue({
      name: DOCUMENT_PROCESSING_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
