import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/HttpException.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Obtener ConfigService
  const configService = app.get(ConfigService);

  // Get environment config
  const nodeEnv = configService.get<string>('app.nodeEnv') || process.env['NODE_ENV'];
  const isProduction = nodeEnv === 'production';

  // Configurar cookie-parser para leer HttpOnly cookies
  app.use(cookieParser());

  // Configurar Helmet para headers de seguridad HTTP
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

  // Configurar CORS con credentials y validación de origen
  // SECURITY: Get CORS origins (already parsed as array in app.config.ts)
  const corsOrigin = configService.get('app.corsOrigin');
  const allowedOrigins = Array.isArray(corsOrigin)
    ? corsOrigin.map(o => String(o).trim())
    : ['http://localhost:3000'];

  // SECURITY: Validate CORS configuration on startup
  console.log(`🔒 CORS Configuration:`);
  console.log(`   Environment: ${nodeEnv}`);
  console.log(`   Allowed origins: ${allowedOrigins.length} origin(s)`);

  if (isProduction) {
    console.log(`   ⚠️  Production mode: Strict CORS validation enabled`);

    // Validate: No wildcards in production
    const hasWildcards = allowedOrigins.some(origin => origin.includes('*'));
    if (hasWildcards) {
      console.error(`\n❌ CRITICAL SECURITY ERROR: Wildcards detected in CORS_ORIGIN!`);
      console.error(`   Production requires specific HTTPS domains only.`);
      console.error(`   Example: CORS_ORIGIN=https://yourapp.vercel.app`);
      console.error(`\n   Current config: ${allowedOrigins.join(', ')}\n`);
      process.exit(1);
    }

    // Validate: Only HTTPS in production
    const hasHttp = allowedOrigins.some(origin => origin.startsWith('http://'));
    if (hasHttp) {
      console.error(`\n❌ CRITICAL SECURITY ERROR: HTTP origins in production!`);
      console.error(`   Only HTTPS origins are allowed in production.`);
      console.error(`   Current config: ${allowedOrigins.join(', ')}\n`);
      process.exit(1);
    }

    console.log(`   ✅ CORS validation passed`);
  } else {
    console.log(`   Development mode: HTTP and wildcards allowed`);
  }

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list (exact match or wildcard pattern)
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        // Exact match
        if (allowedOrigin === origin) {
          return true;
        }

        // Wildcard pattern matching (e.g., http://192.168.0.*:3000)
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
            .replace(/\*/g, '.*'); // Replace * with .*
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }

        return false;
      });

      if (isAllowed) {
        // In production, enforce HTTPS
        if (isProduction && !origin.startsWith('https://')) {
          console.warn(`🚨 CORS: Rejected non-HTTPS origin in production: ${origin}`);
          return callback(new Error('Only HTTPS origins are allowed in production'), false);
        }
        return callback(null, true);
      }

      // Origin not allowed
      console.warn(`🚨 CORS: Rejected unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count'],
  });

  // Global validation pipe para DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no declaradas
      transform: true, // Transforma los tipos automáticamente
    })
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  // Configuración de Swagger/OpenAPI - Solo en entornos de desarrollo
  // En producción, la documentación está protegida para reducir superficie de ataque
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('AsistenciaLegal API')
      .setDescription('API REST para el sistema de gestión legal con autenticación JWT y RBAC')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth' // Nombre del esquema de seguridad
      )
      .addTag('auth', 'Endpoints de autenticación')
      .addTag('users', 'Gestión de usuarios')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    console.log(`📚 Swagger documentation: http://localhost:${configService.get<number>('app.port') || 3000}/api/docs`);
  } else {
    console.log('📚 Swagger documentation: DISABLED in non-development environments for security');
  }

  // Obtener puerto de configuración
  const port = configService.get<number>('app.port') || 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
