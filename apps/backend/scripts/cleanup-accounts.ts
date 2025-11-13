import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ANÁLISIS DE CUENTAS EN LA BASE DE DATOS\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Listar todas las cuentas
  const allAccounts = await prisma.account.findMany({
    include: {
      invitations: true,
      members: true,
    }
  });

  console.log(`📊 Total de cuentas encontradas: ${allAccounts.length}\n`);

  // Separar cuenta del sistema de las demás
  const systemAccount = allAccounts.find(acc => acc.isSystemAccount);
  const otherAccounts = allAccounts.filter(acc => !acc.isSystemAccount);

  if (systemAccount) {
    console.log('✅ CUENTA DEL SISTEMA (SE MANTENDRÁ Y RENOMBRARÁ):');
    console.log(`   ID: ${systemAccount.id}`);
    console.log(`   Nombre actual: "${systemAccount.name}"`);
    console.log(`   Nombre nuevo: "Empleados"`);
    console.log(`   Status: ${systemAccount.status}`);
    console.log(`   Miembros: ${systemAccount.members.length}`);
    console.log(`   Invitaciones: ${systemAccount.invitations.length}`);
    console.log('');
  } else {
    console.log('⚠️  NO SE ENCONTRÓ CUENTA DEL SISTEMA');
    console.log('   Abortando operación por seguridad.\n');
    process.exit(1);
  }

  if (otherAccounts.length > 0) {
    console.log(`🗑️  CUENTAS QUE SERÁN ELIMINADAS (${otherAccounts.length}):\n`);
    otherAccounts.forEach((acc, index) => {
      console.log(`   ${index + 1}. "${acc.name}"`);
      console.log(`      - ID: ${acc.id}`);
      console.log(`      - Status: ${acc.status}`);
      console.log(`      - Miembros: ${acc.members.length}`);
      console.log(`      - Invitaciones: ${acc.invitations.length}`);
      console.log('');
    });
  } else {
    console.log('✅ No hay cuentas adicionales para eliminar\n');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('🚀 EJECUTANDO OPERACIONES...\n');

  // 2. Eliminar cuentas no del sistema
  if (otherAccounts.length > 0) {
    console.log('🗑️  Eliminando cuentas...');

    for (const account of otherAccounts) {
      try {
        // Primero eliminar invitaciones relacionadas
        const deletedInvitations = await prisma.accountInvitation.deleteMany({
          where: { accountId: account.id }
        });
        console.log(`   ✓ Eliminadas ${deletedInvitations.count} invitaciones de "${account.name}"`);

        // Eliminar usuarios miembros de la cuenta (que no sean SUPER_ADMIN ni el creador)
        const deletedUsers = await prisma.user.deleteMany({
          where: {
            accountId: account.id,
            role: { not: 'SUPER_ADMIN' },
            id: { not: account.createdBy }
          }
        });
        console.log(`   ✓ Eliminados ${deletedUsers.count} usuarios de "${account.name}"`);

        // Finalmente eliminar la cuenta
        await prisma.account.delete({
          where: { id: account.id }
        });
        console.log(`   ✅ Cuenta "${account.name}" eliminada exitosamente\n`);

      } catch (error: any) {
        console.error(`   ❌ Error eliminando cuenta "${account.name}":`, error.message);
      }
    }
  }

  // 3. Renombrar cuenta del sistema
  if (systemAccount) {
    console.log('📝 Renombrando cuenta del sistema...');
    try {
      const updatedAccount = await prisma.account.update({
        where: { id: systemAccount.id },
        data: { name: 'Empleados' }
      });
      console.log(`   ✅ Cuenta renombrada: "${systemAccount.name}" → "${updatedAccount.name}"\n`);
    } catch (error: any) {
      console.error(`   ❌ Error renombrando cuenta:`, error.message);
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('✅ OPERACIONES COMPLETADAS\n');

  // 4. Verificación final
  const finalAccounts = await prisma.account.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      isSystemAccount: true,
    }
  });

  console.log('📊 ESTADO FINAL:');
  console.log(`   Total de cuentas: ${finalAccounts.length}\n`);

  for (const acc of finalAccounts) {
    const members = await prisma.user.count({
      where: { accountId: acc.id }
    });

    const invitations = await prisma.accountInvitation.count({
      where: { accountId: acc.id }
    });

    console.log(`   - "${acc.name}"`);
    console.log(`     ID: ${acc.id}`);
    console.log(`     Status: ${acc.status}`);
    console.log(`     Sistema: ${acc.isSystemAccount ? 'Sí' : 'No'}`);
    console.log(`     Miembros: ${members}`);
    console.log(`     Invitaciones: ${invitations}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
