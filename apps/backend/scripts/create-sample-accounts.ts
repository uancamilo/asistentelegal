import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creando cuentas de clientes de ejemplo...\n');

  try {
    // Primero verificar si ya existen cuentas de clientes
    const existingClientAccounts = await prisma.account.findMany({
      where: { isSystemAccount: false }
    });

    if (existingClientAccounts.length > 0) {
      console.log(`ℹ️  Ya existen ${existingClientAccounts.length} cuentas de clientes:`);
      existingClientAccounts.forEach(acc => {
        console.log(`   - ${acc.name}`);
      });
      console.log('\n¿Deseas crear más cuentas de ejemplo? Continuando...\n');
    }

    // Crear usuarios propietarios de cuentas
    const sampleAccounts = [
      {
        accountName: 'Empresa Demo S.A.',
        ownerEmail: 'owner.demo@example.com',
        ownerFirstName: 'Carlos',
        ownerLastName: 'Empresario',
      },
      {
        accountName: 'Corporación Test',
        ownerEmail: 'owner.test@example.com',
        ownerFirstName: 'María',
        ownerLastName: 'Gerente',
      },
      {
        accountName: 'Startup Innovadora',
        ownerEmail: 'owner.startup@example.com',
        ownerFirstName: 'José',
        ownerLastName: 'Fundador',
      }
    ];

    const defaultPassword = 'Password123!'; // Contraseña temporal
    const hashedPassword = await argon2.hash(defaultPassword);

    for (const sample of sampleAccounts) {
      // Verificar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: sample.ownerEmail }
      });

      if (existingUser) {
        console.log(`⚠️  Usuario ${sample.ownerEmail} ya existe. Saltando...`);
        continue;
      }

      // Verificar si la cuenta ya existe
      const existingAccount = await prisma.account.findUnique({
        where: { name: sample.accountName }
      });

      if (existingAccount) {
        console.log(`⚠️  Cuenta "${sample.accountName}" ya existe. Saltando...`);
        continue;
      }

      // Crear usuario propietario
      const owner = await prisma.user.create({
        data: {
          id: createId(),
          email: sample.ownerEmail,
          passwordHash: hashedPassword,
          firstName: sample.ownerFirstName,
          lastName: sample.ownerLastName,
          role: 'ACCOUNT_OWNER',
          status: 'ACTIVE',
        }
      });

      // Crear cuenta de cliente (isSystemAccount = false por defecto)
      const account = await prisma.account.create({
        data: {
          id: createId(),
          name: sample.accountName,
          ownerId: owner.id,
          createdBy: owner.id,
          status: 'ACTIVE',
          isSystemAccount: false, // Cuenta de cliente
        }
      });

      // Asociar el owner a la cuenta
      await prisma.user.update({
        where: { id: owner.id },
        data: { accountId: account.id }
      });

      console.log(`✅ Cuenta "${account.name}" creada exitosamente`);
      console.log(`   - ID: ${account.id}`);
      console.log(`   - Propietario: ${owner.email}`);
      console.log(`   - Tipo: Cliente (isSystemAccount: false)`);
      console.log(`   - Password temporal: ${defaultPassword}\n`);
    }

    // Mostrar resumen final
    const totalAccounts = await prisma.account.count();
    const clientAccounts = await prisma.account.count({
      where: { isSystemAccount: false }
    });
    const systemAccounts = await prisma.account.count({
      where: { isSystemAccount: true }
    });

    console.log('\n📊 Resumen de cuentas en la base de datos:');
    console.log(`   - Total: ${totalAccounts}`);
    console.log(`   - Cuentas de clientes: ${clientAccounts}`);
    console.log(`   - Cuentas del sistema: ${systemAccounts}\n`);

    console.log('✨ Proceso completado exitosamente!\n');
    console.log('💡 Ahora puedes:');
    console.log('   1. Iniciar sesión como ADMIN y ver las cuentas de clientes');
    console.log('   2. Iniciar sesión como SUPER_ADMIN y ver todas las cuentas');
    console.log('   3. Las cuentas de clientes son visibles en /admin/accounts\n');

  } catch (error) {
    console.error('❌ Error al crear cuentas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
