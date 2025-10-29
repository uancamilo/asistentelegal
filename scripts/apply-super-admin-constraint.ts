import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Script para aplicar el constraint único de SUPER_ADMIN en la tabla User.
 *
 * IMPORTANTE: Este script crea el mismo índice que las migraciones oficiales:
 * - 20251014205642_init_users_table (migración inicial)
 * - 20251028194647_restore_super_admin_unique_constraint (restauración)
 * - 20251028222058_remove_duplicate_super_admin_index (limpieza)
 *
 * El índice oficial es: "unique_super_admin"
 *
 * Casos de uso:
 * - Ambientes de desarrollo sin historial completo de migraciones
 * - Validación de integridad de base de datos antes de despliegue
 * - Troubleshooting de bases de datos con constraint faltante
 * - Ambientes de CI/CD con bases de datos efímeras
 *
 * El script es idempotente: puede ejecutarse múltiples veces sin error.
 * Si el constraint ya existe, no realiza ninguna acción.
 *
 * @version 2.0.0 - Actualizado 2025-10-28
 * @changelog Alineado con migración 20251028222058_remove_duplicate_super_admin_index
 */
async function main() {
  console.log('🔧 Aplicando constraint único de SUPER_ADMIN...\n');

  try {
    // Eliminar índices previos para garantizar idempotencia completa
    // Esto previene conflictos si existe un índice con nombre diferente o duplicado
    console.log('📋 Paso 1: Eliminando índices previos (si existen)...');

    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "public"."User_role_super_admin_unique";
    `);
    console.log('   ✓ Índice "User_role_super_admin_unique" eliminado (si existía)');

    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "public"."unique_super_admin";
    `);
    console.log('   ✓ Índice "unique_super_admin" eliminado (si existía)\n');

    // Crear el índice con la convención de naming oficial del proyecto
    // Nota: Usa el mismo nombre y sintaxis que la migración inicial (20251014205642_init_users_table)
    // y las migraciones de corrección posteriores
    console.log('📋 Paso 2: Creando índice oficial...');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "unique_super_admin"
      ON "User" ((role))
      WHERE role = 'SUPER_ADMIN';
    `);

    console.log('   ✅ Constraint único creado exitosamente!');
    console.log('   📌 Nombre del índice: unique_super_admin');
    console.log('   🔒 Restricción: Solo un usuario con rol SUPER_ADMIN permitido\n');

    // Verificar que el constraint funciona correctamente
    console.log('📋 Paso 3: Verificando estado de SUPER_ADMINs...');

    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true, role: true, status: true },
    });

    console.log(`   📊 SUPER_ADMINs actuales en la base de datos: ${superAdmins.length}`);

    if (superAdmins.length === 0) {
      console.log('   ⚠️  No hay ningún SUPER_ADMIN en la base de datos.');
      console.log('   💡 Ejecuta el script de inicialización: npm run init-superadmin\n');
    } else if (superAdmins.length === 1) {
      const admin = superAdmins[0];
      if (admin) {
        console.log(`   ✅ ${admin.email} (ID: ${admin.id}, Estado: ${admin.status})`);
        console.log('\n✅ La base de datos está en estado consistente!\n');
      }
    } else {
      // Este caso solo puede ocurrir si el constraint no existía antes de ejecutar el script
      console.log('\n   ⚠️  ADVERTENCIA: Se detectaron múltiples SUPER_ADMINs:');
      superAdmins.forEach((admin) => {
        console.log(`      - ${admin.email} (ID: ${admin.id}, Estado: ${admin.status})`);
      });
      console.log('\n   🔒 El constraint ahora evitará agregar más SUPER_ADMINs.');
      console.log('   💡 Considera degradar los SUPER_ADMINs excedentes manualmente:\n');
      console.log('   Ejemplo:');
      console.log('   psql $DATABASE_URL -c "UPDATE \\"User\\" SET role = \'ADMIN\' WHERE email = \'email@example.com\';"');
      console.log('');
    }

    // Verificar que el índice fue creado correctamente en el catálogo de PostgreSQL
    console.log('📋 Paso 4: Verificando índice en catálogo de PostgreSQL...');

    const indexCheck = await prisma.$queryRawUnsafe<Array<{ indexname: string, indexdef: string }>>(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE tablename = 'User' AND indexname = 'unique_super_admin';`
    );

    if (indexCheck.length > 0 && indexCheck[0]) {
      console.log('   ✅ Índice verificado en catálogo de PostgreSQL');
      console.log(`   📝 Definición: ${indexCheck[0].indexdef.substring(0, 80)}...\n`);
    } else {
      console.warn('   ⚠️  Advertencia: El índice no aparece en pg_indexes');
      console.warn('   Esto puede ser esperado en algunas configuraciones de PostgreSQL.\n');
    }

    // Verificar que no existen índices duplicados o con nombres incorrectos
    console.log('📋 Paso 5: Verificando ausencia de índices duplicados...');

    const duplicateCheck = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname
       FROM pg_indexes
       WHERE tablename = 'User' AND indexname LIKE '%super_admin%';`
    );

    const duplicates = duplicateCheck.filter(idx => idx.indexname !== 'unique_super_admin');

    if (duplicates.length > 0) {
      console.warn('   ⚠️  Se detectaron índices adicionales relacionados con SUPER_ADMIN:');
      duplicates.forEach(idx => console.warn(`      - ${idx.indexname}`));
      console.warn('   Considera ejecutar la migración de limpieza: 20251028222058_remove_duplicate_super_admin_index\n');
    } else {
      console.log('   ✅ No se detectaron índices duplicados\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Proceso completado exitosamente');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error al aplicar el constraint:', error.message);

    // Proporcionar ayuda contextual basada en el error
    if (error.message?.includes('already exists')) {
      console.log('\nℹ️  El índice ya existe. Esto es normal si:');
      console.log('   - Las migraciones de Prisma ya se ejecutaron');
      console.log('   - Este script ya se ejecutó previamente');
      console.log('\n   ✅ No se requiere acción adicional.\n');
      return; // No es un error crítico
    } else if (error.message?.includes('duplicate key')) {
      console.log('\n⚠️  Ya existen múltiples SUPER_ADMINs en la base de datos.');
      console.log('   Debes consolidarlos a uno solo ANTES de aplicar el constraint:\n');
      console.log('   Pasos recomendados:');
      console.log('   1. Identifica qué SUPER_ADMIN debe permanecer');
      console.log('   2. Ejecuta:');
      console.log('      psql $DATABASE_URL -c "UPDATE \\"User\\" SET role = \'ADMIN\' WHERE role = \'SUPER_ADMIN\' AND email != \'email-a-mantener@example.com\';"');
      console.log('   3. Vuelve a ejecutar este script\n');
    } else if (error.message?.includes('permission denied')) {
      console.log('\n⚠️  Error de permisos. Verifica:');
      console.log('   - El usuario de base de datos tiene permisos para crear índices');
      console.log('   - DATABASE_URL en .env es correcto');
      console.log('   - La conexión a la base de datos es válida\n');
    }

    throw error; // Re-lanzar para que process.exit(1) se ejecute
  }
}

main()
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
