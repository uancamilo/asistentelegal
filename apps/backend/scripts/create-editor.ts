import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating EDITOR user...\n');

  // Check if EDITOR already exists
  const existingEditor = await prisma.user.findFirst({
    where: { role: 'EDITOR' },
  });

  if (existingEditor) {
    console.log('✅ EDITOR already exists:');
    console.log(`   Email: ${existingEditor.email}\n`);
    return;
  }

  // Find SUPER_ADMIN to get account
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!superAdmin || !superAdmin.accountId) {
    console.error('❌ ERROR: SUPER_ADMIN not found or has no account');
    process.exit(1);
  }

  const password = process.env['EDITOR_PASSWORD'] || 'Editor2025Secure!';
  const passwordHash = await argon2.hash(password);

  const editor = await prisma.user.create({
    data: {
      email: 'editor@asistencialegal.com',
      passwordHash,
      firstName: 'Editor',
      lastName: 'User',
      role: 'EDITOR',
      status: 'ACTIVE',
      accountId: superAdmin.accountId,
    },
  });

  console.log('✅ EDITOR created successfully:');
  console.log(`   Email: ${editor.email}`);
  console.log(`   ID: ${editor.id}\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
