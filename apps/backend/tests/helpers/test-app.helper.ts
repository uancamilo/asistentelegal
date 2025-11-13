import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';

/**
 * Test Application Helper
 *
 * Creates a NestJS application instance for E2E testing
 * with production-like configuration but using test database
 */
export class TestAppHelper {
  private static app: INestApplication;

  /**
   * Create and configure test application
   */
  static async createApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    const app = moduleFixture.createNestApplication();

    // Apply same middleware as production
    app.use(cookieParser());

    // Apply validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    // Set global prefix
    app.setGlobalPrefix('api');

    await app.init();

    this.app = app;
    return app;
  }

  /**
   * Get existing app instance
   */
  static getApp(): INestApplication {
    if (!this.app) {
      throw new Error('App not created. Call createApp() first.');
    }
    return this.app;
  }

  /**
   * Close application
   */
  static async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
      console.log('✓ Test application closed');
    }
  }
}
