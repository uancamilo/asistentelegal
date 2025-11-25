import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

async function main() {
  const prisma = new PrismaClient();
  const newPassword = 'wBDvJ4OfMiqrl9xilgxuT7WJQEn8d6QR';
  const hashedPassword = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const result = await prisma.user.update({
    where: { email: 'admin@email.com' },
    data: { passwordHash: hashedPassword }
  });

  console.log('Password updated for user:', result.email);
  await prisma.$disconnect();
}

main().catch(console.error);
