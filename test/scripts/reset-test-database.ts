import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

// Load .env.test
config({ path: resolve(__dirname, '../../.env.test') });

async function resetTestDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to test database');

    // Drop and recreate public schema (simplest approach)
    console.log('🗑️  Dropping and recreating public schema...');
    await dataSource.query(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await dataSource.query(`CREATE SCHEMA public;`);
    await dataSource.query(`GRANT ALL ON SCHEMA public TO PUBLIC;`);
    await dataSource.query(`GRANT ALL ON SCHEMA public TO postgres;`);

    console.log('✅ All tables and functions dropped');
    console.log(
      '📦 Database reset complete. Run "npm run test:migrate" to recreate schema.',
    );
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

resetTestDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
