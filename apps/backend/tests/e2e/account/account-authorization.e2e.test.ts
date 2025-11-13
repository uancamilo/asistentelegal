import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/database/prisma.service';
import { PasswordService } from '../../../src/modules/user/infrastructure/services/Password.service';

/**
 * Tests E2E de Autorización y Seguridad para Account Endpoints
 *
 * Este archivo contiene tests exhaustivos para verificar:
 * 1. Autenticación JWT requerida en todos los endpoints
 * 2. Autorización por rol (SUPER_ADMIN, ADMIN, ACCOUNT_OWNER, etc.)
 * 3. Protección de cuenta Employees en TODOS los escenarios
 * 4. Validaciones de DTOs
 * 5. Manejo de errores (404, 403, 409, 400)
 *
 * CRÍTICO: Estos tests son la validación final de que la cuenta Employees
 * está protegida y que los permisos funcionan correctamente.
 */
describe('Account Authorization E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;

  // Tokens JWT para diferentes roles
  let superAdminToken: string;
  let adminToken: string;
  let accountOwnerToken: string;
  let editorToken: string;
  let memberToken: string;

  // IDs de usuarios y cuentas
  let superAdminId: string;
  let accountOwnerId: string;

  let employeesAccountId: string;
  let clientAccount1Id: string;
  let clientAccount2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configurar ValidationPipe global (igual que en main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    passwordService = app.get<PasswordService>(PasswordService);

    // Limpiar base de datos y crear datos de prueba
    await setupTestData();
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await cleanupTestData();
    await app.close();
  });

  /**
   * Setup: Crear usuarios de prueba, cuenta Employees y cuentas de cliente
   */
  async function setupTestData() {
    // Limpiar datos existentes
    await cleanupTestData();

    const hashedPassword = await passwordService.hash('TestPassword123!');

    // 1. Buscar cuenta Employees existente (o crearla si no existe)
    let employeesAccount = await prisma['account'].findFirst({
      where: { name: 'Employees', isSystemAccount: true },
    });

    if (!employeesAccount) {
      employeesAccount = await prisma['account'].create({
        data: {
          id: 'employees-account-e2e',
          name: 'Employees',
          ownerId: 'temp-owner-id',
          createdBy: 'temp-owner-id',
          status: 'ACTIVE',
          isSystemAccount: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    employeesAccountId = employeesAccount.id;

    // 2. Crear SUPER_ADMIN
    const superAdmin = await prisma['user'].create({
      data: {
        id: 'superadmin-e2e',
        email: 'superadmin-e2e@test.com',
        passwordHash: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        accountId: employeesAccountId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      },
    });
    superAdminId = superAdmin.id;

    // Actualizar ownerId de Employees solo si fue creado por estos tests
    if (employeesAccount.ownerId === 'temp-owner-id') {
      await prisma['account'].update({
        where: { id: employeesAccountId },
        data: { ownerId: superAdminId },
      });
    }

    // 3. Crear ADMIN
    await prisma['user'].create({
      data: {
        id: 'admin-e2e',
        email: 'admin-e2e@test.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        status: 'ACTIVE',
        accountId: employeesAccountId,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      },
    });

    // 4. Crear cuenta de cliente 1
    const clientAccount1 = await prisma['account'].create({
      data: {
        id: 'client-account-1-e2e',
        name: 'Client Account 1',
        ownerId: 'temp-owner-1',
        createdBy: 'temp-owner-1',
        status: 'ACTIVE',
        isSystemAccount: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    clientAccount1Id = clientAccount1.id;

    // 5. Crear ACCOUNT_OWNER para cuenta 1
    const accountOwner = await prisma['user'].create({
      data: {
        id: 'account-owner-e2e',
        email: 'owner-e2e@test.com',
        passwordHash: hashedPassword,
        firstName: 'Account',
        lastName: 'Owner',
        role: 'ACCOUNT_OWNER',
        status: 'ACTIVE',
        accountId: clientAccount1Id,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      },
    });
    accountOwnerId = accountOwner.id;

    // Actualizar ownerId de cuenta 1
    await prisma['account'].update({
      where: { id: clientAccount1Id },
      data: { ownerId: accountOwnerId },
    });

    // 6. Crear cuenta de cliente 2
    const clientAccount2 = await prisma['account'].create({
      data: {
        id: 'client-account-2-e2e',
        name: 'Client Account 2',
        ownerId: superAdminId,
        createdBy: superAdminId,
        status: 'ACTIVE',
        isSystemAccount: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    clientAccount2Id = clientAccount2.id;

    // 7. Crear EDITOR
    await prisma['user'].create({
      data: {
        id: 'editor-e2e',
        email: 'editor-e2e@test.com',
        passwordHash: hashedPassword,
        firstName: 'Editor',
        lastName: 'User',
        role: 'EDITOR',
        status: 'ACTIVE',
        accountId: clientAccount1Id,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      },
    });

    // 8. Crear MEMBER
    await prisma['user'].create({
      data: {
        id: 'member-e2e',
        email: 'member-e2e@test.com',
        passwordHash: hashedPassword,
        firstName: 'Member',
        lastName: 'User',
        role: 'MEMBER',
        status: 'ACTIVE',
        accountId: clientAccount1Id,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      },
    });

    // Obtener tokens JWT para cada usuario
    superAdminToken = await loginAndGetToken('superadmin-e2e@test.com', 'TestPassword123!');
    adminToken = await loginAndGetToken('admin-e2e@test.com', 'TestPassword123!');
    accountOwnerToken = await loginAndGetToken('owner-e2e@test.com', 'TestPassword123!');
    editorToken = await loginAndGetToken('editor-e2e@test.com', 'TestPassword123!');
    memberToken = await loginAndGetToken('member-e2e@test.com', 'TestPassword123!');
  }

  /**
   * Helper: Login y obtener token JWT
   */
  async function loginAndGetToken(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken;
  }

  /**
   * Cleanup: Eliminar todos los datos de prueba
   */
  async function cleanupTestData() {
    // Primero eliminar todos los usuarios de prueba E2E
    await prisma['user'].deleteMany({
      where: {
        OR: [
          { email: { endsWith: '-e2e@test.com' } },
          { id: { contains: '-e2e' } },
        ],
      },
    });

    // Luego eliminar todas las cuentas de prueba E2E (excepto Employees que es del sistema)
    await prisma['account'].deleteMany({
      where: {
        AND: [
          {
            OR: [
              { id: { contains: '-e2e' } },
              { name: { startsWith: 'Test Account' } },
              { name: { startsWith: 'Client Account' } },
              { name: { startsWith: 'Temp' } },
              { name: { contains: 'SUPER_ADMIN' } },
              { name: { contains: 'ADMIN' } },
              { name: { contains: 'Owner' } },
            ],
          },
          { name: { not: 'Employees' } }, // NO eliminar Employees
        ],
      },
    });
  }

  // =================================================================
  // TEST SUITE: POST /api/accounts (Crear cuenta)
  // =================================================================

  describe('POST /api/accounts - Create Account', () => {
    describe('Authentication', () => {
      it('should reject request without JWT token', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/accounts')
          .send({ name: 'Test Account', ownerId: accountOwnerId })
          .expect(401);

        expect(response.body.message).toContain('Unauthorized');
      });
    });

    describe('Authorization by Role', () => {
      it('should allow SUPER_ADMIN to create account', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'Test Account SUPER_ADMIN',
            ownerId: accountOwnerId,
          })
          .expect(201);

        expect(response.body.name).toBe('Test Account SUPER_ADMIN');
        expect(response.body.isSystemAccount).toBe(false);

        // Cleanup
        await prisma['account'].delete({
          where: { id: response.body.id },
        });
      });

      it('should allow ADMIN to create account', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Account ADMIN',
            ownerId: accountOwnerId,
          })
          .expect(201);

        expect(response.body.name).toBe('Test Account ADMIN');
        expect(response.body.isSystemAccount).toBe(false);

        // Cleanup
        await prisma['account'].delete({
          where: { id: response.body.id },
        });
      });

      it('should reject ACCOUNT_OWNER creating account', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .send({
            name: 'Test Account',
            ownerId: accountOwnerId,
          })
          .expect(403);
      });

      it('should reject EDITOR creating account', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({
            name: 'Test Account',
            ownerId: accountOwnerId,
          })
          .expect(403);
      });

      it('should reject MEMBER creating account', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${memberToken}`)
          .send({
            name: 'Test Account',
            ownerId: accountOwnerId,
          })
          .expect(403);
      });
    });

    describe('Business Logic Validations', () => {
      it('should reject duplicate account name', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'Client Account 1', // Already exists
            ownerId: accountOwnerId,
          })
          .expect(409);

        expect(response.body.message).toContain('already exists');
      });

      it('should reject if owner does not exist', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'Test Account',
            ownerId: 'non-existent-owner-id',
          })
          .expect(404);
      });

      it('should reject account name "Employees" (reserved)', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'Employees',
            ownerId: accountOwnerId,
          })
          .expect(409);
      });
    });

    describe('DTO Validation', () => {
      it('should reject empty name', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: '',
            ownerId: accountOwnerId,
          })
          .expect(400);
      });

      it('should reject name shorter than 3 characters', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'AB',
            ownerId: accountOwnerId,
          })
          .expect(400);
      });

      it('should reject name longer than 100 characters', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'A'.repeat(101),
            ownerId: accountOwnerId,
          })
          .expect(400);
      });

      it('should reject missing ownerId', async () => {
        await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'Test Account',
          })
          .expect(400);
      });
    });

    describe('System Account Protection', () => {
      it('should ALWAYS create accounts with isSystemAccount = false', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'Test Account E2E',
            ownerId: accountOwnerId,
          })
          .expect(201);

        expect(response.body.isSystemAccount).toBe(false);

        // Cleanup
        await prisma['account'].delete({
          where: { id: response.body.id },
        });
      });
    });
  });

  // =================================================================
  // TEST SUITE: GET /api/accounts (Listar cuentas)
  // =================================================================

  describe('GET /api/accounts - List Accounts', () => {
    describe('Authentication', () => {
      it('should reject request without JWT token', async () => {
        await request(app.getHttpServer()).get('/api/accounts').expect(401);
      });
    });

    describe('Authorization by Role', () => {
      it('should allow SUPER_ADMIN to list accounts', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        expect(Array.isArray(response.body.accounts)).toBe(true);
      });

      it('should allow ADMIN to list accounts', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body.accounts)).toBe(true);
      });

      it('should reject ACCOUNT_OWNER listing accounts', async () => {
        await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .expect(403);
      });

      it('should reject EDITOR listing accounts', async () => {
        await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${editorToken}`)
          .expect(403);
      });

      it('should reject MEMBER listing accounts', async () => {
        await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });
    });

    describe('Employees Account Protection', () => {
      it('should return Employees account to SUPER_ADMIN', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        const employeesAccount = response.body.accounts.find(
          (acc: any) => acc.id === employeesAccountId
        );

        expect(employeesAccount).toBeDefined();
        expect(employeesAccount.name).toBe('Employees');
        expect(employeesAccount.isSystemAccount).toBe(true);
      });

      it('should NOT return Employees account to ADMIN', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const employeesAccount = response.body.accounts.find(
          (acc: any) => acc.id === employeesAccountId
        );

        expect(employeesAccount).toBeUndefined();
      });

      it('should return only client accounts to ADMIN', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/accounts')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const hasSystemAccounts = response.body.accounts.some((acc: any) => acc.isSystemAccount);

        expect(hasSystemAccounts).toBe(false);
      });
    });
  });

  // =================================================================
  // TEST SUITE: GET /api/accounts/:id (Obtener cuenta)
  // =================================================================

  describe('GET /api/accounts/:id - Get Account', () => {
    describe('Authentication', () => {
      it('should reject request without JWT token', async () => {
        await request(app.getHttpServer()).get(`/api/accounts/${clientAccount1Id}`).expect(401);
      });
    });

    describe('SUPER_ADMIN Access', () => {
      it('should allow SUPER_ADMIN to view any client account', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        expect(response.body.id).toBe(clientAccount1Id);
      });

      it('should allow SUPER_ADMIN to view Employees account', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/accounts/${employeesAccountId}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        expect(response.body.id).toBe(employeesAccountId);
        expect(response.body.name).toBe('Employees');
        expect(response.body.isSystemAccount).toBe(true);
      });
    });

    describe('ADMIN Access', () => {
      it('should allow ADMIN to view client accounts', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.id).toBe(clientAccount1Id);
      });

      it('should reject ADMIN viewing Employees account', async () => {
        await request(app.getHttpServer())
          .get(`/api/accounts/${employeesAccountId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(403);
      });
    });

    describe('ACCOUNT_OWNER Access', () => {
      it('should allow ACCOUNT_OWNER to view their own account', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .expect(200);

        expect(response.body.id).toBe(clientAccount1Id);
      });

      it('should reject ACCOUNT_OWNER viewing another account', async () => {
        await request(app.getHttpServer())
          .get(`/api/accounts/${clientAccount2Id}`)
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .expect(403);
      });

      it('should reject ACCOUNT_OWNER viewing Employees account', async () => {
        await request(app.getHttpServer())
          .get(`/api/accounts/${employeesAccountId}`)
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .expect(403);
      });
    });

    describe('Other Roles', () => {
      it('should reject EDITOR viewing any account', async () => {
        await request(app.getHttpServer())
          .get(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .expect(403);
      });

      it('should reject MEMBER viewing any account', async () => {
        await request(app.getHttpServer())
          .get(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent account', async () => {
        await request(app.getHttpServer())
          .get('/api/accounts/non-existent-id')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(404);
      });
    });
  });

  // =================================================================
  // TEST SUITE: PATCH /api/accounts/:id (Actualizar cuenta)
  // =================================================================

  describe('PATCH /api/accounts/:id - Update Account', () => {
    describe('Authentication', () => {
      it('should reject request without JWT token', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .send({ name: 'Updated Name' })
          .expect(401);
      });
    });

    describe('SUPER_ADMIN Access', () => {
      it('should allow SUPER_ADMIN to update client account', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount2Id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ name: 'Updated by SUPER_ADMIN' })
          .expect(200);

        expect(response.body.name).toBe('Updated by SUPER_ADMIN');

        // Revert
        await prisma['account'].update({
          where: { id: clientAccount2Id },
          data: { name: 'Client Account 2' },
        });
      });

      it('should prevent SUPER_ADMIN from renaming Employees account', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${employeesAccountId}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ name: 'Renamed Employees' })
          .expect(403);
      });
    });

    describe('ADMIN Access', () => {
      it('should allow ADMIN to update client account', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount2Id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated by ADMIN' })
          .expect(200);

        expect(response.body.name).toBe('Updated by ADMIN');

        // Revert
        await prisma['account'].update({
          where: { id: clientAccount2Id },
          data: { name: 'Client Account 2' },
        });
      });

      it('should reject ADMIN updating Employees account', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${employeesAccountId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'New Name' })
          .expect(403);
      });
    });

    describe('ACCOUNT_OWNER Access', () => {
      it('should allow ACCOUNT_OWNER to update their own account', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .send({ name: 'Updated by Owner' })
          .expect(200);

        expect(response.body.name).toBe('Updated by Owner');

        // Revert
        await prisma['account'].update({
          where: { id: clientAccount1Id },
          data: { name: 'Client Account 1' },
        });
      });

      it('should reject ACCOUNT_OWNER updating another account', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount2Id}`)
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .send({ name: 'New Name' })
          .expect(403);
      });
    });

    describe('Other Roles', () => {
      it('should reject EDITOR updating any account', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ name: 'New Name' })
          .expect(403);
      });

      it('should reject MEMBER updating any account', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .send({ name: 'New Name' })
          .expect(403);
      });
    });

    describe('Business Logic', () => {
      it('should reject duplicate account name', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ name: 'Client Account 2' }) // Already exists
          .expect(409);
      });

      it('should allow updating to same name (no change)', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ name: 'Client Account 1' })
          .expect(200);

        expect(response.body.name).toBe('Client Account 1');
      });
    });

    describe('DTO Validation', () => {
      it('should reject empty name', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ name: '' })
          .expect(400);
      });

      it('should reject name shorter than 3 characters', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ name: 'AB' })
          .expect(400);
      });
    });
  });

  // =================================================================
  // TEST SUITE: DELETE /api/accounts/:id (Eliminar cuenta)
  // =================================================================

  describe('DELETE /api/accounts/:id - Delete Account', () => {
    describe('Authentication', () => {
      it('should reject request without JWT token', async () => {
        await request(app.getHttpServer()).delete(`/api/accounts/${clientAccount2Id}`).expect(401);
      });
    });

    describe('Authorization - SUPER_ADMIN Only', () => {
      it('should allow SUPER_ADMIN to delete account without users', async () => {
        // Create temporary account
        const tempAccount = await prisma['account'].create({
          data: {
            id: 'temp-delete-test',
            name: 'Temp Delete Test',
            ownerId: superAdminId,
            createdBy: superAdminId,
            status: 'ACTIVE',
            isSystemAccount: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        const response = await request(app.getHttpServer())
          .delete(`/api/accounts/${tempAccount.id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        expect(response.body.message).toContain('deleted successfully');
      });

      it('should reject ADMIN deleting accounts', async () => {
        await request(app.getHttpServer())
          .delete(`/api/accounts/${clientAccount2Id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(403);
      });

      it('should reject ACCOUNT_OWNER deleting accounts', async () => {
        await request(app.getHttpServer())
          .delete(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${accountOwnerToken}`)
          .expect(403);
      });

      it('should reject EDITOR deleting accounts', async () => {
        await request(app.getHttpServer())
          .delete(`/api/accounts/${clientAccount2Id}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .expect(403);
      });

      it('should reject MEMBER deleting accounts', async () => {
        await request(app.getHttpServer())
          .delete(`/api/accounts/${clientAccount2Id}`)
          .set('Authorization', `Bearer ${memberToken}`)
          .expect(403);
      });
    });

    describe('System Account Protection', () => {
      it('should reject deleting Employees account', async () => {
        await request(app.getHttpServer())
          .delete(`/api/accounts/${employeesAccountId}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(403);
      });
    });

    describe('Business Logic', () => {
      it('should reject deleting account with active users', async () => {
        // clientAccount1 tiene usuarios activos (owner, editor, member)
        await request(app.getHttpServer())
          .delete(`/api/accounts/${clientAccount1Id}`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(403);
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for non-existent account', async () => {
        await request(app.getHttpServer())
          .delete('/api/accounts/non-existent-id')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(404);
      });
    });
  });
});
