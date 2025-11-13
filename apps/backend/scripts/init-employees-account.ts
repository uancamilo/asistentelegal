import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env['ADMIN_EMAIL'] || 'admin@email.com';

  // Verificar que exista el SUPER_ADMIN
  const superAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!superAdmin) {
    console.log(`No se encontró SUPER_ADMIN con email: ${superAdminEmail}`);
    process.exit(1);
  }

  // Verificar si la cuenta "Employees" ya existe
  let employeesAccount = await prisma.account.findUnique({
    where: { name: 'Employees' },
  });

  if (!employeesAccount) {
    // Crear la cuenta Employees y asignar el SUPER_ADMIN como owner
    employeesAccount = await prisma.account.create({
      data: {
        name: 'Employees',
        ownerId: superAdmin.id,
        createdBy: superAdmin.id,
        isSystemAccount: true,
        status: 'ACTIVE',
      },
    });

    console.log("Cuenta 'Employees' creada y SUPER_ADMIN asignado como owner.");
  } else {
    console.log("La cuenta 'Employees' ya existe.");
  }

  // Actualizar SUPER_ADMIN para asegurarse de que tenga accountId correcto
  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { accountId: employeesAccount.id },
  });

  console.log("SUPER_ADMIN actualizado con accountId de 'Employees'.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
