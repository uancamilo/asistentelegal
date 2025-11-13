import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Verifica y repara automáticamente la integridad de las relaciones
 * entre el SuperAdmin y la cuenta Employees.
 *
 * Garantiza:
 * - SuperAdmin.accountId === Employees.id
 * - Employees.ownerId === SuperAdmin.id
 * - No hay duplicados
 *
 * En caso de estado corrupto irrecuperable, resetea la base de datos
 * y reejecuta la inicialización completa.
 */
async function verifyAndFixRelations() {
  console.log('\n🔍 Verificando integridad de relaciones SuperAdmin ↔ Employees...\n');

  try {
    // Buscar todos los SUPER_ADMIN (para detectar duplicados)
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      include: { account: true, ownedAccount: true },
    });

    // Buscar todas las cuentas Employees (para detectar duplicados)
    const employeesAccounts = await prisma.account.findMany({
      where: { name: { in: ['Employees', 'Empleados'] } },
      include: { owner: true, members: true },
    });

    // ==========================================
    // DETECCIÓN DE ESTADOS CORRUPTOS SEVEROS
    // ==========================================

    // Caso 1: No existe SuperAdmin o Employees
    if (superAdmins.length === 0 || employeesAccounts.length === 0) {
      console.log('❌ Estado corrupto: No se encontraron SuperAdmin o cuenta Employees.');
      console.log('🧹 Reiniciando base de datos y reejecutando inicialización...\n');
      await prisma.$disconnect();
      const { execSync } = await import('child_process');
      execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });
      execSync('npm run init-superadmin', { stdio: 'inherit' });
      return;
    }

    // Caso 2: Duplicados de SuperAdmin
    if (superAdmins.length > 1) {
      console.log(
        `❌ Estado corrupto: Se encontraron ${superAdmins.length} usuarios SUPER_ADMIN (debe haber solo 1).`
      );
      console.log('🧹 Reiniciando base de datos y reejecutando inicialización...\n');
      await prisma.$disconnect();
      const { execSync } = await import('child_process');
      execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });
      execSync('npm run init-superadmin', { stdio: 'inherit' });
      return;
    }

    // Caso 3: Duplicados de cuenta Employees
    if (employeesAccounts.length > 1) {
      console.log(
        `❌ Estado corrupto: Se encontraron ${employeesAccounts.length} cuentas Employees (debe haber solo 1).`
      );
      console.log('🧹 Reiniciando base de datos y reejecutando inicialización...\n');
      await prisma.$disconnect();
      const { execSync } = await import('child_process');
      execSync('npx prisma migrate reset --force --skip-seed', { stdio: 'inherit' });
      execSync('npm run init-superadmin', { stdio: 'inherit' });
      return;
    }

    // ==========================================
    // VERIFICACIÓN Y REPARACIÓN DE RELACIONES
    // ==========================================

    const superAdmin = superAdmins[0]!; // Safe: ya verificamos que existe
    const employees = employeesAccounts[0]!; // Safe: ya verificamos que existe

    const actions = [];
    let needsRepair = false;

    // Verificación 1: SuperAdmin.accountId debe ser igual a Employees.id
    if (!superAdmin.accountId || superAdmin.accountId !== employees.id) {
      console.log(
        '⚠️  Inconsistencia detectada: SuperAdmin.accountId no coincide con Employees.id'
      );
      console.log(`   Actual: ${superAdmin.accountId || 'NULL'}`);
      console.log(`   Esperado: ${employees.id}`);
      needsRepair = true;
      actions.push(
        prisma.user.update({
          where: { id: superAdmin.id },
          data: { accountId: employees.id },
        })
      );
    }

    // Verificación 2: Employees.ownerId debe ser igual a SuperAdmin.id
    if (!employees.ownerId || employees.ownerId !== superAdmin.id) {
      console.log('⚠️  Inconsistencia detectada: Employees.ownerId no coincide con SuperAdmin.id');
      console.log(`   Actual: ${employees.ownerId || 'NULL'}`);
      console.log(`   Esperado: ${superAdmin.id}`);
      needsRepair = true;
      actions.push(
        prisma.account.update({
          where: { id: employees.id },
          data: { ownerId: superAdmin.id },
        })
      );
    }

    // ==========================================
    // APLICAR REPARACIONES SI ES NECESARIO
    // ==========================================

    if (needsRepair) {
      console.log('\n⚠️  Reparando relaciones inconsistentes...');
      await prisma.$transaction(actions);
      console.log('✅ Relaciones reparadas correctamente\n');

      // Mostrar estado final
      const verifiedSuperAdmin = await prisma.user.findUnique({
        where: { id: superAdmin.id },
        include: { account: true },
      });
      const verifiedEmployees = await prisma.account.findUnique({
        where: { id: employees.id },
        include: { owner: true },
      });

      console.log('📊 Estado final verificado:');
      console.log(`   SuperAdmin.accountId: ${verifiedSuperAdmin?.accountId}`);
      console.log(`   Employees.id: ${verifiedEmployees?.id}`);
      console.log(`   Employees.ownerId: ${verifiedEmployees?.ownerId}`);
      console.log(`   SuperAdmin.id: ${verifiedSuperAdmin?.id}`);
      console.log(`   ✅ Relación bidireccional confirmada\n`);
    } else {
      console.log('✅ Relaciones ya eran consistentes');
      console.log(`   SuperAdmin.accountId: ${superAdmin.accountId}`);
      console.log(`   Employees.id: ${employees.id}`);
      console.log(`   Employees.ownerId: ${employees.ownerId}`);
      console.log(`   SuperAdmin.id: ${superAdmin.id}`);
      console.log(`   ✅ Estado íntegro confirmado\n`);
    }
  } catch (error) {
    console.error('\n❌ Error durante la verificación de relaciones:', error);
    throw error;
  }
}

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
      console.log('   Running verification and repair...\n');
    }

    // Ejecutar verificación y reparación incluso si ya existe
    await verifyAndFixRelations();
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

    // ==========================================
    // STEP 4: Verificación y reparación automática de relaciones
    // ==========================================
    await verifyAndFixRelations();
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
