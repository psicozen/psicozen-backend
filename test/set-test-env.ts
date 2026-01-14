import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test file FIRST
const envTestPath = resolve(__dirname, '../.env.test');
const result = config({ path: envTestPath });

if (result.error) {
  console.error('❌ Failed to load .env.test:', result.error);
  throw result.error;
}

// Set test environment
process.env.NODE_ENV = 'test';

console.log('✅ Test environment loaded');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password in logs
