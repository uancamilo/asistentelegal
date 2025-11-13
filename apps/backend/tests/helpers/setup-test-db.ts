/**
 * Test Database Setup Script
 *
 * Run this script to initialize test database:
 * npm run test:db:setup
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { TestDatabaseHelper } from './test-database.helper';

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

async function setupTestDatabase() {
  console.log('Setting up test database...');
  console.log('Database URL:', process.env['DATABASE_URL']);

  try {
    // Connect to database
    await TestDatabaseHelper.connect();
    console.log('✓ Connected to test database');

    // Reset schema
    await TestDatabaseHelper.resetDatabase();

    // Seed initial data
    await TestDatabaseHelper.seedTestData();

    console.log('\n✅ Test database setup complete!');
    console.log('You can now run tests with: npm test\n');
  } catch (error) {
    console.error('\n❌ Test database setup failed:', error);
    process.exit(1);
  } finally {
    await TestDatabaseHelper.disconnect();
  }
}

setupTestDatabase();
