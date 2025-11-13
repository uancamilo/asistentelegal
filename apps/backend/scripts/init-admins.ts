import { PrismaClient, User } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting ADMIN and EDITOR initialization...\n');

  // ==========================================
  // STEP 0: Validar variables de entorno requeridas
  // ==========================================
  const SECONDARY_ADMIN_PASSWORD = process.env['SECONDARY_ADMIN_PASSWORD'];
  const EDITOR_PASSWORD = process.env['EDITOR_PASSWORD'];

  if (!SECONDARY_ADMIN_PASSWORD || !EDITOR_PASSWORD) {
    console.error('❌ ERROR: Missing required environment variables');
    console.error('   Required: SECONDARY_ADMIN_PASSWORD, EDITOR_PASSWORD');
    console.error('   Check your .env file\n');
    process.exit(1);
  }

  // ==========================================
  // STEP 1: Verificar que existe SUPER_ADMIN y cuenta Employees
  // ==========================================
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    include: { account: true },
  });

  if (!superAdmin) {
    console.error('❌ ERROR: SUPER_ADMIN not found.');
    console.error('   Please run: npm run init-superadmin\n');
    process.exit(1);
  }

  if (!superAdmin.accountId || !superAdmin.account) {
    console.error('❌ ERROR: SUPER_ADMIN has no account assigned.');
    console.error('   Database is in an inconsistent state.\n');
    process.exit(1);
  }

  const employeesAccount = superAdmin.account;

  if (employeesAccount.name !== 'Employees') {
    console.error('❌ ERROR: SUPER_ADMIN account is not named "Employees".');
    console.error(`   Found: "${employeesAccount.name}"\n`);
    process.exit(1);
  }

  console.log('✅ SUPER_ADMIN found:');
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Account: ${employeesAccount.name} (ID: ${employeesAccount.id})\n`);

  // ==========================================
  // STEP 2: Verificar usuarios existentes
  // ==========================================
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [{ email: 'admin@asistencialegal.com' }, { email: 'editor@asistencialegal.com' }],
    },
    select: { email: true, role: true },
  });

  const existingAdminEmail = existingUsers.find(
    (u: { email: string; role: string }) => u.email === 'admin@asistencialegal.com'
  );
  const existingEditorEmail = existingUsers.find(
    (u: { email: string; role: string }) => u.email === 'editor@asistencialegal.com'
  );

  if (existingAdminEmail && existingEditorEmail) {
    console.log('⚠️  Both ADMIN and EDITOR already exist:');
    console.log(`   ADMIN: ${existingAdminEmail.email}`);
    console.log(`   EDITOR: ${existingEditorEmail.email}\n`);
    console.log('📊 No changes made.\n');
    return;
  }

  // ==========================================
  // STEP 3: Crear ADMIN y EDITOR con TRANSACCIÓN ATÓMICA
  // ==========================================

  console.log('🔄 Creating employees with atomic transaction...\n');

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const created: { admin?: User; editor?: User } = {};

      // 3.1: Crear ADMIN si no existe
      if (!existingAdminEmail) {
        const adminPasswordHash = await argon2.hash(SECONDARY_ADMIN_PASSWORD);

        created.admin = await tx.user.create({
          data: {
            email: 'admin@asistencialegal.com',
            passwordHash: adminPasswordHash,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            status: 'INVITED',
            accountId: employeesAccount.id, // ✅ Asignado a Employees
          },
        });

        console.log('✅ ADMIN created (Step 1/2)');
        console.log(`   ID: ${created.admin!.id}`);
        console.log(`   Email: ${created.admin!.email}`);
        console.log(`   Account: ${employeesAccount.name}`);
        console.log(`   Password: [REDACTED - See .env:SECONDARY_ADMIN_PASSWORD]\n`);
      } else {
        console.log('⚠️  ADMIN already exists, skipping...\n');
      }

      // 3.2: Crear EDITOR si no existe
      if (!existingEditorEmail) {
        const editorPasswordHash = await argon2.hash(EDITOR_PASSWORD);

        created.editor = await tx.user.create({
          data: {
            email: 'editor@asistencialegal.com',
            passwordHash: editorPasswordHash,
            firstName: 'Editor',
            lastName: 'User',
            role: 'EDITOR',
            status: 'INVITED',
            accountId: employeesAccount.id, // ✅ Asignado a Employees
          },
        });

        console.log('✅ EDITOR created (Step 2/2)');
        console.log(`   ID: ${created.editor!.id}`);
        console.log(`   Email: ${created.editor!.email}`);
        console.log(`   Account: ${employeesAccount.name}`);
        console.log(`   Password: [REDACTED - See .env:EDITOR_PASSWORD]\n`);
      } else {
        console.log('⚠️  EDITOR already exists, skipping...\n');
      }

      return created;
    });

    // ==========================================
    // STEP 4: Resumen final
    // ==========================================
    console.log('═══════════════════════════════════════');
    console.log('✅ Employee initialization completed!\n');

    const totalUsers = await prisma.user.count();
    const employeesCount = await prisma.user.count({
      where: { accountId: employeesAccount.id },
    });

    console.log('📊 Summary:');
    console.log(`   Total users in database: ${totalUsers}`);
    console.log(`   Users in "Employees" account: ${employeesCount}\n`);

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    console.log('   Users by role:');
    usersByRole.forEach((group: { role: string; _count: number }) => {
      console.log(`   - ${group.role}: ${group._count}`);
    });

    console.log('═══════════════════════════════════════\n');

    if (result.admin || result.editor) {
      console.log('⚠️  IMPORTANT: Change default passwords in production!\n');
    }
  } catch (error) {
    console.error('\n❌ TRANSACTION FAILED: All changes have been rolled back.');
    console.error('   Error details:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Fatal error during employee initialization:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
