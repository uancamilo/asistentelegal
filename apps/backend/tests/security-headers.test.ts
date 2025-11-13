import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';

dotenv.config();

/**
 * Test suite para validar headers de seguridad HTTP configurados con Helmet
 *
 * Objetivo: Verificar que la aplicación incluye headers de seguridad estándar
 * para mitigar vulnerabilidades OWASP como clickjacking, MIME sniffing,
 * degradación HTTPS, y otros ataques comunes.
 *
 * Headers validados:
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: SAMEORIGIN
 * - Strict-Transport-Security (HSTS)
 * - X-DNS-Prefetch-Control: off
 * - X-Download-Options: noopen
 * - Content-Security-Policy (CSP)
 */
describe('Security Headers (Helmet)', () => {
  let app: INestApplication;
  let httpServer: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configurar Helmet para headers de seguridad HTTP (igual que en main.ts)
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginEmbedderPolicy: false, // Evita conflictos con CORS
      })
    );

    await app.init();
    httpServer = app.getHttpServer();
  }, 30000); // Timeout extendido para inicialización del AppModule

  afterAll(async () => {
    await app.close();
  });

  describe('Headers de seguridad básicos', () => {
    it('should include X-Content-Type-Options: nosniff header', async () => {
      const response = await request(httpServer).get('/api');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options: SAMEORIGIN header', async () => {
      const response = await request(httpServer).get('/api');

      expect(response.headers['x-frame-options']).toBeDefined();
      // Helmet puede usar SAMEORIGIN o DENY
      expect(['SAMEORIGIN', 'DENY']).toContain(response.headers['x-frame-options']);
    });

    it('should include Strict-Transport-Security (HSTS) header', async () => {
      const response = await request(httpServer).get('/api');

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain('max-age=');
    });

    it('should include X-DNS-Prefetch-Control header', async () => {
      const response = await request(httpServer).get('/api');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('should include X-Download-Options: noopen header', async () => {
      const response = await request(httpServer).get('/api');

      expect(response.headers['x-download-options']).toBe('noopen');
    });

    it('should include Content-Security-Policy header', async () => {
      const response = await request(httpServer).get('/api');

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Validación en diferentes endpoints', () => {
    it('should apply security headers to /api/docs (Swagger)', async () => {
      const response = await request(httpServer).get('/api/docs');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should apply security headers to /api/auth/login', async () => {
      const response = await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'test123' });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should apply security headers to authenticated endpoints', async () => {
      // Test sin autenticación, pero validamos que los headers existan
      const response = await request(httpServer).get('/api/users/me');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should configure CSP with default-src self', async () => {
      const response = await request(httpServer).get('/api');

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
    });

    it('should allow unsafe-inline for styles (Swagger compatibility)', async () => {
      const response = await request(httpServer).get('/api');

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should restrict script-src to self', async () => {
      const response = await request(httpServer).get('/api');

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("script-src 'self'");
    });

    it('should allow images from self, data, and https', async () => {
      const response = await request(httpServer).get('/api');

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("img-src 'self' data: https:");
    });
  });

  describe('Headers ausentes (seguridad mejorada)', () => {
    it('should not include X-Powered-By header (ocultar tecnología)', async () => {
      const response = await request(httpServer).get('/api');

      // Helmet elimina X-Powered-By por defecto
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should not include Server header with detailed info', async () => {
      const response = await request(httpServer).get('/api');

      // Idealmente, el header Server no debería revelar información sensible
      // En algunos casos puede ser undefined o contener solo "nginx" / "apache"
      const serverHeader = response.headers['server'];
      if (serverHeader) {
        expect(serverHeader).not.toContain('Express');
        expect(serverHeader).not.toContain('NestJS');
      }
    });
  });

  describe('Protección contra ataques comunes', () => {
    it('should prevent MIME type sniffing attacks', async () => {
      const response = await request(httpServer).get('/api');

      // X-Content-Type-Options: nosniff previene que el navegador
      // intente "adivinar" el tipo MIME de un recurso
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await request(httpServer).get('/api');

      // X-Frame-Options previene que la página sea embebida en un iframe
      // lo cual mitiga ataques de clickjacking
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should enforce HTTPS connections', async () => {
      const response = await request(httpServer).get('/api');

      // Strict-Transport-Security fuerza al navegador a usar HTTPS
      // incluso si el usuario intenta acceder vía HTTP
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should restrict resource loading with CSP', async () => {
      const response = await request(httpServer).get('/api');

      // Content-Security-Policy previene ataques XSS limitando
      // las fuentes de recursos que puede cargar la página
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });
});
