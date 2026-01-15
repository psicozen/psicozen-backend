import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file with NODE_ENV=test
const envPath = resolve(__dirname, '../.env');
const result = config({ path: envPath });

if (result.error) {
  // Don't fail if .env doesn't exist - use system env vars (CI)
  console.log(
    'ℹ️  .env not found, using system environment variables (CI mode)',
  );
} else {
  console.log('✅ Environment variables loaded from .env (local mode)');
}

// Set test environment
process.env.NODE_ENV = 'test';

// Verify required environment variables are present
if (!process.env.DB_HOST || !process.env.DB_USERNAME || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
  throw new Error(
    '❌ Database configuration (DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE) is required. Set them in .env.test (local) or as environment variables (CI)',
  );
}

console.log(
  'Database connection:',
  `${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_DATABASE}`,
);
