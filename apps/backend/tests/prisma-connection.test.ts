import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Prisma Database Connection', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to the database successfully', async () => {
    await expect(prisma.$queryRaw`SELECT 1 as result`).resolves.toBeDefined();
  });

  it('should have User and Account models', async () => {
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();

    expect(typeof userCount).toBe('number');
    expect(typeof accountCount).toBe('number');
  });

  it('should enforce SUPER_ADMIN unique constraint', async () => {
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
    });

    expect(superAdmins.length).toBeLessThanOrEqual(1);
  });

  it('should prevent creating duplicate SUPER_ADMIN at database level', async () => {
    // First, check if a SUPER_ADMIN already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (existingSuperAdmin) {
      // If one exists, trying to create another should fail
      await expect(
        prisma.user.create({
          data: {
            email: 'duplicate-super-admin@test.com',
            passwordHash: 'hashedpassword',
            firstName: 'Duplicate',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow(/unique constraint/i);
    } else {
      // If no SUPER_ADMIN exists, we can create one, but not two
      const firstSuperAdmin = await prisma.user.create({
        data: {
          email: 'first-super-admin@test.com',
          passwordHash: 'hashedpassword',
          firstName: 'First',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        },
      });

      // Now trying to create a second one should fail
      await expect(
        prisma.user.create({
          data: {
            email: 'second-super-admin@test.com',
            passwordHash: 'hashedpassword',
            firstName: 'Second',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
          },
        })
      ).rejects.toThrow(/unique constraint/i);

      // Cleanup
      await prisma.user.delete({ where: { id: firstSuperAdmin.id } });
    }
  });
});
