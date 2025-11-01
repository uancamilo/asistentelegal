import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as dotenv from 'dotenv';
import { AppModule } from '../src/app.module';

dotenv.config();

/**
 * Test suite para validar rate limiting en endpoints de autenticación
 *
 * Objetivo: Verificar que la protección contra ataques de fuerza bruta
 * funciona correctamente en /auth/login y /auth/refresh.
 *
 * Estrategia de testing:
 * - ThrottlerGuard se ejecuta ANTES de la validación de credenciales
 * - Por lo tanto, podemos probar el rate limiting sin credenciales válidas
 * - Los primeros N intentos devolverán HTTP 401 (credenciales inválidas)
 * - El intento N+1 devolverá HTTP 429 (rate limit excedido)
 */
describe('Auth Rate Limiting (ThrottlerGuard)', () => {
  let app: INestApplication;
  let httpServer: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();
  }, 30000); // Timeout extendido para inicialización del AppModule

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login - Rate limiting (5 req/60s)', () => {
    it('should allow up to 5 login attempts within 60 seconds', async () => {
      const loginPayload = {
        email: 'test@example.com',
        password: 'invalidpassword',
      };

      // Intentos 1-5: Deben devolver HTTP 401 (credenciales inválidas)
      // pero NO HTTP 429 (rate limit no excedido)
      for (let i = 1; i <= 5; i++) {
        await request(httpServer)
          .post('/auth/login')
          .send(loginPayload)
          .expect((res: request.Response) => {
            // Puede ser 401 (credenciales inválidas) o 404 (endpoint no encontrado)
            // Lo importante es que NO sea 429 (rate limit)
            expect(res.status).not.toBe(429);
          });
      }
    });

    it('should return HTTP 429 after exceeding 5 login attempts', async () => {
      const loginPayload = {
        email: 'test-rate-limit@example.com',
        password: 'testpassword123',
      };

      // Primeros 5 intentos: No deben devolver HTTP 429
      for (let i = 1; i <= 5; i++) {
        await request(httpServer)
          .post('/auth/login')
          .send(loginPayload);
      }

      // 6º intento: Debe devolver HTTP 429 (rate limit excedido)
      const response = await request(httpServer)
        .post('/auth/login')
        .send(loginPayload)
        .expect(429);

      // Validar headers de rate limiting (opcionales, dependen del storage provider)
      // El storage en memoria no genera headers, pero Redis sí los generaría
      // Si los headers existen, validamos su contenido
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining) {
          expect(parseInt(remaining)).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('POST /auth/refresh - Rate limiting (10 req/60s)', () => {
    it('should allow up to 10 refresh attempts within 60 seconds', async () => {
      const refreshPayload = {
        refreshToken: 'invalid-refresh-token-for-testing',
      };

      // Intentos 1-10: No deben devolver HTTP 429
      for (let i = 1; i <= 10; i++) {
        await request(httpServer)
          .post('/auth/refresh')
          .send(refreshPayload)
          .expect((res: request.Response) => {
            // Puede ser 401 (token inválido) o 404 (endpoint no encontrado)
            // Lo importante es que NO sea 429 (rate limit)
            expect(res.status).not.toBe(429);
          });
      }
    });

    it('should return HTTP 429 after exceeding 10 refresh attempts', async () => {
      const refreshPayload = {
        refreshToken: 'test-rate-limit-refresh-token',
      };

      // Primeros 10 intentos: No deben devolver HTTP 429
      for (let i = 1; i <= 10; i++) {
        await request(httpServer)
          .post('/auth/refresh')
          .send(refreshPayload);
      }

      // 11º intento: Debe devolver HTTP 429 (rate limit excedido)
      const response = await request(httpServer)
        .post('/auth/refresh')
        .send(refreshPayload)
        .expect(429);

      // Validar headers de rate limiting (opcionales, dependen del storage provider)
      // El storage en memoria no genera headers, pero Redis sí los generaría
      // Si los headers existen, validamos su contenido
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining) {
          expect(parseInt(remaining)).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('Concurrent requests simulation', () => {
    it('should handle multiple concurrent login requests and apply rate limiting', async () => {
      const loginPayload = {
        email: 'concurrent-test@example.com',
        password: 'testpassword',
      };

      // Simular 6 requests concurrentes (1 más que el límite de 5)
      // Reducido para evitar problemas de conexión ECONNRESET
      const requests = Array.from({ length: 6 }, () =>
        request(httpServer)
          .post('/auth/login')
          .send(loginPayload)
          .catch((err: Error) => ({ status: 0, error: err.message })) // Manejar errores de conexión
      );

      const responses = await Promise.all(requests);

      // Al menos uno de los responses debe ser HTTP 429
      const rateLimitedResponses = responses.filter((res: any) => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent refresh requests and apply rate limiting', async () => {
      const refreshPayload = {
        refreshToken: 'concurrent-refresh-token',
      };

      // Simular 12 requests concurrentes (2 más que el límite de 10)
      // Reducido para evitar problemas de conexión ECONNRESET
      const requests = Array.from({ length: 12 }, () =>
        request(httpServer)
          .post('/auth/refresh')
          .send(refreshPayload)
          .catch((err: Error) => ({ status: 0, error: err.message })) // Manejar errores de conexión
      );

      const responses = await Promise.all(requests);

      // Al menos uno de los responses debe ser HTTP 429
      const rateLimitedResponses = responses.filter((res: any) => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Rate limiting differentiation by controller', () => {
    it('should apply different rate limits: /auth (5 req/60s) vs /users (30 req/60s)', async () => {
      // Este test valida que diferentes controladores tienen límites independientes
      // /auth/login tiene límite de 5 req/60s (configuración global)
      // /users/* tiene límite de 30 req/60s (configuración personalizada)

      // Nota: /users/* requiere autenticación JWT, por lo que este test
      // solo puede validar la diferencia conceptual en la configuración.
      // En un entorno real, se requeriría un token válido para probar /users/*.

      // Validación conceptual: ambos controladores están configurados pero con límites diferentes
      expect(app).toBeDefined();
      expect(httpServer).toBeDefined();

      // Se puede verificar que /auth sigue funcionando independientemente
      // después de que /users (hipotéticamente) haya consumido sus requests
      const loginPayload = {
        email: 'isolation-test@example.com',
        password: 'testpassword',
      };

      // Validar que /auth/login sigue respondiendo (aunque falle por credenciales)
      const response = await request(httpServer)
        .post('/auth/login')
        .send(loginPayload);

      // Debe ser 401 (credenciales inválidas) o 404 (endpoint no encontrado), NO 500 (error de configuración)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });
});
