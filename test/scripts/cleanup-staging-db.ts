import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Load .env.test
config({ path: resolve(__dirname, '../../.env.test') });

async function cleanupStagingDatabase() {
  // ⚠️ CRITICAL WARNING: This script uses TRUNCATE CASCADE which is a DESTRUCTIVE operation
  // It will DELETE ALL DATA from all tables and reset sequences
  // This should ONLY be used in staging/development environments
  // DO NOT run this against production databases!

  const dbUrl = process.env.DATABASE_URL;

  // Safety check: Ensure we're not accidentally running against production
  if (!dbUrl || dbUrl.includes('prod')) {
    console.error(
      '🚨 DANGER: This script cannot be run against production databases!',
    );
    console.error('Database URL contains "prod" or is not set.');
    process.exit(1);
  }

  console.log('\n⚠️  WARNING: This will DELETE ALL DATA from the database!');
  console.log('Database URL:', dbUrl.replace(/:[^:@]+@/, ':****@')); // Hide password
  console.log(
    'This script uses TRUNCATE CASCADE which removes all data and resets sequences.\n',
  );

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
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
    // ⚠️ TRUNCATE CASCADE will remove ALL data and reset identity sequences
    // This is more aggressive than DELETE but faster for complete cleanup
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
