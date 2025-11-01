/**
 * Script manual para validar el comportamiento de env.validation con secretos iguales y diferentes
 */
import 'reflect-metadata';
import { validate } from '../src/config/env.validation';

const baseConfig = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'ValidPassword123!',
  SECONDARY_ADMIN_PASSWORD: 'ValidPassword456!',
  EDITOR_PASSWORD: 'ValidPassword789!',
  PORT: '3000',
  NODE_ENV: 'development',
  JWT_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  CORS_ORIGIN: 'http://localhost:3000',
};

console.log('='.repeat(80));
console.log('TEST 1: JWT_SECRET y JWT_REFRESH_SECRET iguales (DEBE FALLAR)');
console.log('='.repeat(80));

try {
  const configSameSecrets = {
    ...baseConfig,
    JWT_SECRET: 'same-secret-with-at-least-32-characters-here-12345678',
    JWT_REFRESH_SECRET: 'same-secret-with-at-least-32-characters-here-12345678',
  };

  validate(configSameSecrets);
  console.log('❌ ERROR: La validación NO falló cuando debería (secretos iguales)');
  process.exit(1);
} catch (error) {
  if (error instanceof Error && error.message.includes('secretsAreDifferent')) {
    console.log('✅ CORRECTO: La validación falló como se esperaba');
    console.log(`   Mensaje de error: ${error.message.substring(0, 150)}...`);
  } else {
    console.log('❌ ERROR: La validación falló pero con mensaje inesperado');
    console.log(`   Error: ${error}`);
    process.exit(1);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('TEST 2: JWT_SECRET y JWT_REFRESH_SECRET diferentes (DEBE PASAR)');
console.log('='.repeat(80));

try {
  const configDifferentSecrets = {
    ...baseConfig,
    JWT_SECRET: 'this-is-jwt-secret-with-at-least-32-characters-here',
    JWT_REFRESH_SECRET: 'this-is-different-refresh-secret-with-at-least-32-chars',
  };

  const result = validate(configDifferentSecrets);
  console.log('✅ CORRECTO: La validación pasó exitosamente');
  console.log(`   JWT_SECRET length: ${result.JWT_SECRET.length}`);
  console.log(`   JWT_REFRESH_SECRET length: ${result.JWT_REFRESH_SECRET.length}`);
  console.log(`   Secrets are different: ${result.JWT_SECRET !== result.JWT_REFRESH_SECRET}`);
} catch (error) {
  console.log('❌ ERROR: La validación falló cuando NO debería (secretos diferentes)');
  console.log(`   Error: ${error}`);
  process.exit(1);
}

console.log('');
console.log('='.repeat(80));
console.log('RESULTADO FINAL: Todos los tests manuales pasaron ✅');
console.log('='.repeat(80));
