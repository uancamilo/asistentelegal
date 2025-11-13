/**
 * Jest Global Setup
 * Runs before all tests to configure test environment
 */

// Load test environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Set test environment
process.env['NODE_ENV'] = 'test';

// Disable Redis caching in tests to avoid external dependencies
if (!process.env['REDIS_URL']) {
  process.env['REDIS_URL'] = '';
}

// Global test timeout
jest.setTimeout(30000);
