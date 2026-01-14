/**
 * Setup Test Database
 *
 * Ensures test database is in a clean, ready state for running tests.
 * Run this if tests are failing due to missing seed data or inconsistent state.
 *
 * Usage: npm run test:setup-db
 */
import '../set-test-env';
import { DataSource } from 'typeorm';
import { getTestDataSourceOptions } from '../config/test-datasource';

async function setupTestDatabase() {
  const dataSource = new DataSource(getTestDataSourceOptions());

  try {
    console.log('🔧 Setting up test database...\n');

    await dataSource.initialize();
    console.log('✅ Connected to test database');

    // Step 1: Check and run pending migrations
    console.log('\n📦 Checking migrations...');
    const pendingMigrations = await dataSource.showMigrations();

    if (pendingMigrations) {
      console.log('⏳ Running pending migrations...');
      const executedMigrations = await dataSource.runMigrations({
        transaction: 'all',
      });

      if (executedMigrations.length > 0) {
        console.log(
          `✅ Executed ${executedMigrations.length} migration(s) successfully`,
        );
      } else {
        console.log('✅ Database schema is up to date');
      }
    } else {
      console.log('✅ Database schema is up to date');
    }

    // Step 2: Verify seed data exists
    console.log('\n🔍 Verifying seed data...');

    const rolesCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM roles WHERE is_system_role = true',
    );
    const rolesNum = parseInt(rolesCount[0].count, 10);

    if (rolesNum === 0) {
      console.log('⚠️  No system roles found. Creating seed data...');

      // Insert system roles
      await dataSource.query(`
        INSERT INTO roles (name, description, is_system_role, hierarchy_level, created_at, updated_at)
        VALUES
          ('super_admin', 'Super Administrator with global access', true, 0, now(), now()),
          ('admin', 'Organization Administrator', true, 100, now(), now()),
          ('gestor', 'Organization Manager', true, 200, now(), now()),
          ('colaborador', 'Organization Collaborator', true, 300, now(), now())
        ON CONFLICT (name) DO UPDATE SET
          hierarchy_level = EXCLUDED.hierarchy_level,
          is_system_role = EXCLUDED.is_system_role;
      `);

      console.log('✅ System roles created');
    } else {
      console.log(`✅ Found ${rolesNum} system roles`);
    }

    // Verify service role user exists
    const serviceUserCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM users WHERE supabase_user_id = '00000000-0000-0000-0000-000000000001'`,
    );
    const serviceUserNum = parseInt(serviceUserCount[0].count, 10);

    if (serviceUserNum === 0) {
      console.log('⚠️  Service role user not found. Creating...');

      await dataSource.query(`
        INSERT INTO users (
          id,
          email,
          supabase_user_id,
          is_active,
          preferences,
          created_at,
          updated_at
        )
        VALUES (
          '00000000-0000-0000-0000-000000000000',
          'service@test.internal',
          '00000000-0000-0000-0000-000000000001',
          true,
          '{}'::jsonb,
          now(),
          now()
        )
        ON CONFLICT (supabase_user_id) DO NOTHING;
      `);

      console.log('✅ Service role user created');
    } else {
      console.log('✅ Service role user exists');
    }

    // Step 3: Clean test data (preserve seed data)
    console.log('\n🧹 Cleaning existing test data...');

    const testDataTables = ['user_roles', 'sessions', 'users', 'organizations'];

    for (const table of testDataTables) {
      const query =
        table === 'users'
          ? `DELETE FROM "${table}" WHERE supabase_user_id != '00000000-0000-0000-0000-000000000001'`
          : `DELETE FROM "${table}" WHERE id IS NOT NULL AND id != '00000000-0000-0000-0000-000000000000'`;

      const result = await dataSource.query(query);
      const rowsDeleted = result[1] || 0;

      if (rowsDeleted > 0) {
        console.log(`  🧹 ${table}: deleted ${rowsDeleted} rows`);
      }
    }

    // Step 4: Final verification
    console.log('\n✅ Final verification:');

    const finalRolesCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM roles WHERE is_system_role = true',
    );
    console.log(`  📊 System roles: ${finalRolesCount[0].count}`);

    const finalServiceUserCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM users WHERE supabase_user_id = '00000000-0000-0000-0000-000000000001'`,
    );
    console.log(`  👤 Service user: ${finalServiceUserCount[0].count}`);

    const testUsersCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM users WHERE supabase_user_id != '00000000-0000-0000-0000-000000000001'`,
    );
    console.log(`  🧪 Test users: ${testUsersCount[0].count}`);

    const testOrgsCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM organizations',
    );
    console.log(`  🏢 Test organizations: ${testOrgsCount[0].count}`);

    await dataSource.destroy();

    console.log('\n🎉 Test database is ready!\n');
    console.log(
      'You can now run: npm run test:integration or npm run test:e2e',
    );
  } catch (error) {
    console.error('\n❌ Failed to setup test database:', error);
    process.exit(1);
  }
}

setupTestDatabase();
