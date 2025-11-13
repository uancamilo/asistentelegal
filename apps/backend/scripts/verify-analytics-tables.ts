import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Verificando tablas de Search Analytics...\n');

    // Verificar que podemos contar registros (tabla existe)
    const searchQueriesCount = await prisma.searchQuery.count();
    const searchClicksCount = await prisma.searchQueryClick.count();

    console.log('✅ Tabla search_queries existe');
    console.log(`   Registros actuales: ${searchQueriesCount}`);

    console.log('✅ Tabla search_query_clicks existe');
    console.log(`   Registros actuales: ${searchClicksCount}`);

    console.log('\n✨ ¡Todas las tablas de analytics están creadas correctamente!');
  } catch (error) {
    console.error('❌ Error al verificar tablas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
