import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const accountCount = await prisma.account.count();
    console.log(`\n📊 Total de cuentas en la base de datos: ${accountCount}`);

    if (accountCount > 0) {
      const accounts = await prisma.account.findMany({
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });

      console.log('\n📋 Cuentas encontradas:\n');
      accounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.name}`);
        console.log(`   - ID: ${account.id}`);
        console.log(`   - Sistema: ${account.isSystemAccount ? 'Sí' : 'No'}`);
        console.log(`   - Propietario: ${account.owner.email} (${account.owner.role})`);
        console.log(`   - Creada: ${account.createdAt.toISOString()}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  La tabla Account está vacía. No hay cuentas registradas.\n');
    }

    // Verificar usuarios también
    const userCount = await prisma.user.count();
    console.log(`\n👥 Total de usuarios en la base de datos: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          accountId: true
        }
      });

      console.log('\n👤 Usuarios encontrados:\n');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.status}`);
        console.log(`   - Nombre: ${user.firstName} ${user.lastName}`);
        console.log(`   - Account ID: ${user.accountId || 'Sin cuenta asignada'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
