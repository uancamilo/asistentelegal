import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as dotenv from 'dotenv';
import { AppModule } from '../src/app.module';

dotenv.config();

/**
 * Test suite para validar logout y revocación de tokens JWT
 *
 * Objetivo: Verificar que el sistema de logout invalida tokens correctamente
 * mediante el incremento del campo tokenVersion en el usuario.
 *
 * Estrategia de testing:
 * - POST /auth/logout requiere autenticación JWT
 * - Al hacer logout, tokenVersion se incrementa
 * - Tokens previos al logout quedan invalidados (HTTP 401)
 * - El logout es idempotente (puede ejecutarse múltiples veces)
 */
describe('Auth Logout and Token Revocation', () => {
  let app: INestApplication;
  let httpServer: any;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/logout - Logout con revocación de tokens', () => {
    beforeEach(async () => {
      // Login para obtener un token fresco antes de cada test
      const loginResponse = await request(httpServer)
        .post('/auth/login')
        .send({
          email: process.env['ADMIN_EMAIL'],
          password: process.env['ADMIN_PASSWORD'],
        });

      if (loginResponse.status === 200) {
        accessToken = loginResponse.body.accessToken;
      }
    });

    it('should return HTTP 200 on successful logout', async () => {
      const response = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Logout successful');
    });

    it('should invalidate token after logout (subsequent requests return HTTP 401)', async () => {
      // 1. Verificar que el token funciona antes del logout
      const beforeLogout = await request(httpServer)
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(beforeLogout.status).toBe(200);

      // 2. Hacer logout
      await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 3. Intentar usar el mismo token después del logout
      const afterLogout = await request(httpServer)
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(afterLogout.body.message).toMatch(/Token revoked or invalid|Unauthorized/i);
    });

    it('should return HTTP 401 when logout without authentication', async () => {
      const response = await request(httpServer)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return HTTP 401 when logout with invalid token', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token';

      await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should be idempotent - repeated logout calls return HTTP 200', async () => {
      // Primer logout
      const firstLogout = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(firstLogout.body.message).toBe('Logout successful');

      // Login nuevamente para obtener un nuevo token
      const loginResponse = await request(httpServer)
        .post('/auth/login')
        .send({
          email: process.env['ADMIN_EMAIL'],
          password: process.env['ADMIN_PASSWORD'],
        })
        .expect(200);

      const newToken = loginResponse.body.accessToken;

      // Segundo logout con nuevo token
      const secondLogout = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(secondLogout.body.message).toBe('Logout successful');
    });

    it('should invalidate refresh tokens after logout', async () => {
      // 1. Login para obtener access y refresh tokens
      const loginResponse = await request(httpServer)
        .post('/auth/login')
        .send({
          email: process.env['ADMIN_EMAIL'],
          password: process.env['ADMIN_PASSWORD'],
        })
        .expect(200);

      const { accessToken: token, refreshToken } = loginResponse.body;

      // 2. Verificar que el refresh token funciona antes del logout
      const beforeLogout = await request(httpServer)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(beforeLogout.status).toBe(200);
      expect(beforeLogout.body).toHaveProperty('accessToken');

      // 3. Hacer logout
      await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 4. Intentar usar el refresh token después del logout
      // Debería fallar porque el tokenVersion cambió
      const afterLogout = await request(httpServer)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(afterLogout.body.message).toMatch(/Invalid refresh token|User not found|User is not active|Token revoked/i);
    });

    it('should allow new login after logout', async () => {
      // 1. Hacer logout
      await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 2. Hacer login nuevamente
      const newLoginResponse = await request(httpServer)
        .post('/auth/login')
        .send({
          email: process.env['ADMIN_EMAIL'],
          password: process.env['ADMIN_PASSWORD'],
        })
        .expect(200);

      expect(newLoginResponse.body).toHaveProperty('accessToken');
      expect(newLoginResponse.body).toHaveProperty('refreshToken');

      const newAccessToken = newLoginResponse.body.accessToken;

      // 3. Verificar que el nuevo token funciona
      const profileResponse = await request(httpServer)
        .get('/users/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('id');
      expect(profileResponse.body).toHaveProperty('email');
    });
  });

  describe('POST /auth/logout - Rate limiting (5 req/60s)', () => {
    beforeEach(async () => {
      // Login para obtener un token fresco
      const loginResponse = await request(httpServer)
        .post('/auth/login')
        .send({
          email: process.env['ADMIN_EMAIL'],
          password: process.env['ADMIN_PASSWORD'],
        });

      if (loginResponse.status === 200) {
        accessToken = loginResponse.body.accessToken;
      }
    });

    it('should allow up to 5 logout attempts within 60 seconds', async () => {
      // Intentar hacer logout 5 veces
      // Nota: Solo el primer logout será exitoso con el mismo token
      // Los siguientes fallarán por token revocado, pero no por rate limiting

      for (let i = 1; i <= 5; i++) {
        const response = await request(httpServer)
          .post('/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`);

        // El rate limit no debe activarse (status no debe ser 429)
        expect(response.status).not.toBe(429);
      }
    });

    it('should return HTTP 429 after exceeding 5 logout attempts', async () => {
      // Primeros 5 intentos
      for (let i = 1; i <= 5; i++) {
        await request(httpServer)
          .post('/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`);
      }

      // 6º intento: Debe devolver HTTP 429 (rate limit excedido)
      const response = await request(httpServer)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(429);

      expect(response.body).toHaveProperty('message');
    });
  });
});
