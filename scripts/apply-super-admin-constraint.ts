import { PrismaClient } from '../generated/prisma';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Applying SUPER_ADMIN unique constraint...\n');

  try {
    // Apply partial unique index for SUPER_ADMIN
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_role_super_admin_unique"
      ON "public"."User"("role")
      WHERE "role" = 'SUPER_ADMIN';
    `);

    console.log('✅ Partial unique index created successfully!');
    console.log('   Index name: User_role_super_admin_unique');
    console.log('   Constraint: Only one SUPER_ADMIN allowed\n');

    // Verify the constraint works
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true },
    });

    console.log(`📊 Current SUPER_ADMINs in database: ${superAdmins.length}`);
    superAdmins.forEach((admin) => {
      console.log(`   - ${admin.email} (ID: ${admin.id})`);
    });

    if (superAdmins.length > 1) {
      console.log(
        '\n⚠️  WARNING: Multiple SUPER_ADMINs detected! The constraint will prevent adding more.'
      );
      console.log('   You may want to manually fix this by demoting extra SUPER_ADMINs.\n');
    } else {
      console.log('\n✅ Database is in a consistent state!\n');
    }
  } catch (error) {
    console.error('\n❌ Error applying constraint:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
