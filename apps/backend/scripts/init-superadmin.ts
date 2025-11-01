import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const ADMIN_EMAIL = process.env['ADMIN_EMAIL'];
  const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
    process.exit(1);
  }

  console.log('🚀 Starting SUPER_ADMIN initialization...\n');

  // ==========================================
  // STEP 1: Verificar si ya existe SUPER_ADMIN
  // ==========================================
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    include: { account: true },
  });

  if (existingSuperAdmin) {
    console.log('⚠️  SUPER_ADMIN already exists:');
    console.log(`   Email: ${existingSuperAdmin.email}`);
    console.log(`   Account: ${existingSuperAdmin.account?.name || 'NULL (inconsistent state!)'}`);

    // Verificar consistencia: SUPER_ADMIN debe tener accountId
    if (!existingSuperAdmin.accountId) {
      console.log('\n⚠️  WARNING: SUPER_ADMIN has no accountId! This is an inconsistent state.');
      console.log('   Consider running a migration to fix this.\n');
    }

    return;
  }

  console.log('✅ No existing SUPER_ADMIN found. Creating new one...\n');

  // ==========================================
  // STEP 2: Crear SUPER_ADMIN + Employees con TRANSACCIÓN ATÓMICA
  // ==========================================

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 2.1: Hashear contraseña
      const passwordHash = await argon2.hash(ADMIN_PASSWORD);

      // 2.2: Crear SUPER_ADMIN con accountId=null (temporal)
      const superAdmin = await tx.user.create({
        data: {
          email: ADMIN_EMAIL,
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          accountId: null, // ✅ Temporal para evitar dependencia circular
        },
      });

      console.log('✅ SUPER_ADMIN user created (Step 1/3)');
      console.log(`   ID: ${superAdmin.id}`);
      console.log(`   Email: ${superAdmin.email}\n`);

      // 2.3: Crear cuenta "Employees" con owner=SUPER_ADMIN
      const employeesAccount = await tx.account.create({
        data: {
          name: 'Employees',
          ownerId: superAdmin.id,
        },
      });

      console.log('✅ Employees account created (Step 2/3)');
      console.log(`   Account ID: ${employeesAccount.id}`);
      console.log(`   Owner ID: ${employeesAccount.ownerId}\n`);

      // 2.4: Actualizar SUPER_ADMIN.accountId para cerrar el ciclo
      const updatedSuperAdmin = await tx.user.update({
        where: { id: superAdmin.id },
        data: { accountId: employeesAccount.id },
      });

      console.log('✅ SUPER_ADMIN.accountId updated (Step 3/3)');
      console.log(`   Account ID: ${updatedSuperAdmin.accountId}\n`);

      return { superAdmin: updatedSuperAdmin, employeesAccount };
    });

    // ==========================================
    // STEP 3: Verificación final
    // ==========================================
    console.log('═══════════════════════════════════════');
    console.log('✅ SUPER_ADMIN initialization completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   User ID: ${result.superAdmin.id}`);
    console.log(`   Email: ${result.superAdmin.email}`);
    console.log(`   Role: ${result.superAdmin.role}`);
    console.log(`   Status: ${result.superAdmin.status}`);
    console.log(`   Account ID: ${result.superAdmin.accountId}`);
    console.log(`   Account Name: ${result.employeesAccount.name}`);
    console.log(`   Created At: ${result.superAdmin.createdAt}`);
    console.log('═══════════════════════════════════════\n');

    console.log('⚠️  IMPORTANT: Change the ADMIN_PASSWORD in production!\n');
  } catch (error) {
    console.error('\n❌ TRANSACTION FAILED: All changes have been rolled back.');
    console.error('   Error details:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Fatal error during SUPER_ADMIN initialization:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
