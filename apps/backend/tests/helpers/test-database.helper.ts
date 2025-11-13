import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Test Database Helper
 *
 * Manages test database lifecycle for integration tests:
 * - Creates/resets test database schema
 * - Seeds initial data
 * - Cleans up after tests
 */
export class TestDatabaseHelper {
  private static prisma: PrismaClient;

  /**
   * Initialize test database connection
   */
  static async connect(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env['DATABASE_URL'],
          },
        },
      });
      await this.prisma.$connect();
    }
    return this.prisma;
  }

  /**
   * Reset database schema (drop + migrate)
   * Use before test suites to ensure clean state
   */
  static async resetDatabase(): Promise<void> {
    try {
      // Push schema without migrations (faster for tests)
      await execAsync('npx prisma db push --force-reset --skip-generate', {
        env: { ...process.env, DATABASE_URL: process.env['DATABASE_URL'] },
      });
      console.log('✓ Test database reset complete');
    } catch (error) {
      console.error('Failed to reset test database:', error);
      throw error;
    }
  }

  /**
   * Clean all tables (faster than full reset)
   * Use between individual tests
   */
  static async cleanDatabase(): Promise<void> {
    const prisma = await this.connect();

    // Delete in order respecting foreign key constraints
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.account.deleteMany({});

    console.log('✓ Test database cleaned');
  }

  /**
   * Seed test data
   * Creates minimal required data for tests
   */
  static async seedTestData(): Promise<void> {
    const prisma = await this.connect();

    // Create Employees system account
    await prisma.account.create({
      data: {
        id: 'acc_employees_test',
        name: 'Employees',
        ownerId: 'system',
        createdBy: 'system',
        status: 'ACTIVE',
        isSystemAccount: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('✓ Test data seeded');
  }

  /**
   * Disconnect from database
   * Call in afterAll hooks
   */
  static async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      console.log('✓ Test database disconnected');
    }
  }

  /**
   * Get Prisma client instance for tests
   */
  static getPrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }
}
