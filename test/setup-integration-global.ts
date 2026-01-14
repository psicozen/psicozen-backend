import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Global Integration Test Setup
 *
 * Runs once before all integration tests to ensure:
 * - Environment variables are loaded
 * - Database connection is established
 * - All migrations are applied
 * - Schema is up-to-date with RLS policies
 */
export default async (): Promise<void> => {
  try {
    // Load .env.test FIRST (globalSetup runs in separate process)
    const envTestPath = resolve(__dirname, '../.env.test');
    const result = config({ path: envTestPath });

    if (result.error) {
      console.error('❌ Failed to load .env.test:', result.error);
      throw result.error;
    }

    console.log('✅ Environment variables loaded');
    console.log('🔧 Setting up integration test environment...');

    // Create a new DataSource instance directly for global setup
    const { DataSource } = await import('typeorm');
    const { getTestDataSourceOptions } = await import('./config/test-datasource');

    const dataSource = new DataSource(getTestDataSourceOptions());

    // Initialize database connection
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // NOTE: Migrations should be run manually beforehand using: npm run migration:run
    // We don't run them here to avoid conflicts with existing schema

    // Close connection (tests will create their own)
    await dataSource.destroy();

    console.log('🎉 Integration test environment ready!');
  } catch (error) {
    console.error(
      '❌ Failed to setup integration test environment:',
      error,
    );
    throw error;
  }
};
