import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Load .env.test
config({ path: resolve(__dirname, '../../.env.test') });

async function cleanupStagingDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to staging database (Render)');

    const tables = await dataSource.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename != 'typeorm_metadata'
    `);

    console.log(`📋 Found ${tables.length} tables to clean`);

    // Build TRUNCATE query for all tables at once
    // This handles foreign key constraints automatically with CASCADE
    if (tables.length > 0) {
      const tableNames = tables
        .map(({ tablename }) => `"${tablename}"`)
        .join(', ');
      console.log(`🧹 Cleaning tables: ${tableNames}`);
      await dataSource.query(
        `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
      );
    }

    console.log('✅ Staging database cleaned successfully');
  } catch (error) {
    console.error('❌ Failed to clean staging database:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run cleanup
cleanupStagingDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
