import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test file if it exists (local development)
// In CI, environment variables come from GitHub Secrets
const envTestPath = resolve(__dirname, '../.env.test');
const result = config({ path: envTestPath });

if (result.error) {
  // Don't fail if .env.test doesn't exist - use system env vars (CI)
  console.log(
    'ℹ️  .env.test not found, using system environment variables (CI mode)',
  );
} else {
  console.log('✅ Environment variables loaded from .env.test (local mode)');
}

// Set test environment
process.env.NODE_ENV = 'test';

// Verify required environment variables are present
if (!process.env.DATABASE_URL) {
  throw new Error(
    '❌ DATABASE_URL is required. Set it in .env.test (local) or as environment variable (CI)',
  );
}

console.log(
  'DATABASE_URL:',
  process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
); // Hide password in logs
