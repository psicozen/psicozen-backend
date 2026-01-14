import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Load .env.test
config({ path: resolve(__dirname, '../../.env.test') });

async function setupMockAuthSchema() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to staging database (Render)');

    // Create mock auth schema
    await dataSource.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
    `);
    console.log('✅ Created auth schema');

    // Create mock auth.uid() function that returns NULL
    // This effectively disables RLS policies in test environment
    await dataSource.query(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS UUID AS $$
      BEGIN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('✅ Created mock auth.uid() function');

    console.log('✅ Mock auth schema setup completed');
  } catch (error) {
    console.error('❌ Failed to setup mock auth schema:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

setupMockAuthSchema()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
