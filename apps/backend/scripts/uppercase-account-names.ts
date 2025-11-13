import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Convirtiendo nombres de cuentas a mayúsculas...\n');

  // Obtener todas las cuentas
  const accounts = await prisma.account.findMany();

  console.log(`📊 Total de cuentas encontradas: ${accounts.length}\n`);

  for (const account of accounts) {
    const uppercaseName = account.name.toUpperCase();
    
    // Solo actualizar si el nombre es diferente
    if (account.name !== uppercaseName) {
      await prisma.account.update({
        where: { id: account.id },
        data: { name: uppercaseName }
      });
      
      console.log(`✓ "${account.name}" → "${uppercaseName}"`);
    } else {
      console.log(`⊘ "${account.name}" (ya está en mayúsculas)`);
    }
  }

  console.log('\n✅ Conversión completada\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
