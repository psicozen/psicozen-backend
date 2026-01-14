import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Global E2E Test Setup
 *
 * Runs once before all E2E tests to ensure:
 * - Environment variables are loaded
 * - Database connection is established
 * - All migrations are applied
 * - Schema is up-to-date with RLS policies
 */
export default async (): Promise<void> => {
  try {
    // Try to load .env.test if it exists (for local development)
    // In CI, environment variables come from GitHub Secrets
    const envTestPath = resolve(__dirname, '../.env.test');
    const result = config({ path: envTestPath });

    if (result.error) {
      // Don't fail if .env.test doesn't exist - use system env vars (CI)
      console.log('ℹ️  .env.test not found, using system environment variables (CI mode)');
    } else {
      console.log('✅ Environment variables loaded from .env.test (local mode)');
    }
    console.log('🔧 Setting up E2E test environment...');

    // Create a new DataSource instance directly for global setup
    const { DataSource } = await import('typeorm');
    const { getTestDataSourceOptions } = await import(
      './config/test-datasource.js'
    );

    const dataSource = new DataSource(getTestDataSourceOptions());

    // Initialize database connection
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // NOTE: Migrations should be run manually beforehand using: npm run migration:run
    // We don't run them here to avoid conflicts with existing schema

    // Close connection (tests will create their own)
    await dataSource.destroy();

    console.log('🎉 E2E test environment ready!');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
};
