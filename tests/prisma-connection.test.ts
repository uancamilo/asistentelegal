import { PrismaClient } from '../generated/prisma';
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
});
