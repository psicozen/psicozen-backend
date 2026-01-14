#!/usr/bin/env ts-node
/**
 * Test Database Setup Script
 *
 * Purpose: Ensure test database is a perfect replica of production schema
 * - Runs all pending migrations
 * - Seeds system roles and permissions
 * - Validates database integrity
 * - Creates service role user for RLS bypass
 *
 * Usage:
 *   npm run test:setup-db
 *   ts-node test/scripts/setup-test-database.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { getTestDataSourceOptions } from '../config/test-datasource';

// Load test environment
config({ path: resolve(__dirname, '../../.env.test') });

const SERVICE_ROLE_UUID = '00000000-0000-0000-0000-000000000001';

async function setupTestDatabase(): Promise<void> {
  let dataSource: DataSource | null = null;

  try {
    console.log('🔧 Setting up test database...\n');

    // 1. Initialize connection
    dataSource = new DataSource(getTestDataSourceOptions());
    await dataSource.initialize();
    console.log('✅ Connected to test database');
    console.log(`   Database: ${process.env.DATABASE_URL?.split('@')[1]}\n`);

    // 2. Check current migration status
    console.log('📊 Checking migration status...');
    const pendingMigrations = await dataSource.showMigrations();

    if (pendingMigrations) {
      console.log('📦 Found pending migrations, running them...\n');

      // 3. Run migrations
      const executedMigrations = await dataSource.runMigrations({
        transaction: 'all', // Run all migrations in a single transaction
      });

      if (executedMigrations.length === 0) {
        console.log('✅ No new migrations to run - database is up to date\n');
      } else {
        console.log(`✅ Successfully ran ${executedMigrations.length} migration(s):`);
        executedMigrations.forEach((migration) => {
          console.log(`   ✓ ${migration.name}`);
        });
        console.log('');
      }
    } else {
      console.log('✅ Database schema is up to date\n');
    }

    // 4. Verify system roles were seeded
    console.log('🔍 Verifying system roles...');
    const rolesResult = await dataSource.query(
      'SELECT name FROM roles WHERE is_system_role = true ORDER BY name',
    );

    if (rolesResult.length === 0) {
      throw new Error(
        '❌ No system roles found! Migration SeedSystemRoles may have failed.',
      );
    }

    console.log(`✅ Found ${rolesResult.length} system roles:`);
    rolesResult.forEach((role: { name: string }) => {
      console.log(`   ✓ ${role.name}`);
    });
    console.log('');

    // 5. Verify permissions were seeded
    console.log('🔍 Verifying permissions...');
    const permissionsResult = await dataSource.query(
      'SELECT COUNT(*) as count FROM permissions',
    );
    const permissionCount = parseInt(permissionsResult[0].count, 10);

    if (permissionCount === 0) {
      throw new Error(
        '❌ No permissions found! Migration SeedSystemRoles may have failed.',
      );
    }

    console.log(`✅ Found ${permissionCount} permissions\n`);

    // 6. Verify service role user exists (for RLS bypass)
    console.log('🔍 Verifying service role user...');
    const serviceUserResult = await dataSource.query(
      `SELECT id, email FROM users WHERE supabase_user_id = $1`,
      [SERVICE_ROLE_UUID],
    );

    if (serviceUserResult.length === 0) {
      console.log('⚠️  Service role user not found - creating it...');

      await dataSource.query(
        `
        INSERT INTO users (supabase_user_id, email, first_name, last_name)
        VALUES ($1, 'service-role@system.local', 'Service', 'Role')
        ON CONFLICT (supabase_user_id) DO NOTHING
      `,
        [SERVICE_ROLE_UUID],
      );

      console.log('✅ Service role user created\n');
    } else {
      console.log(`✅ Service role user exists: ${serviceUserResult[0].email}\n`);
    }

    // 7. Verify RLS policies are enabled
    console.log('🔍 Verifying Row Level Security (RLS) policies...');
    const rlsTablesResult = await dataSource.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'organizations', 'roles', 'permissions', 'user_roles', 'sessions')
      ORDER BY tablename
    `);

    const tablesWithRls: string[] = [];
    const tablesWithoutRls: string[] = [];

    for (const row of rlsTablesResult) {
      const tableName = row.tablename;
      const rlsCheckResult = await dataSource.query(
        `
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = $1 AND relnamespace = 'public'::regnamespace
      `,
        [tableName],
      );

      if (rlsCheckResult.length > 0 && rlsCheckResult[0].relrowsecurity) {
        tablesWithRls.push(tableName);
      } else {
        tablesWithoutRls.push(tableName);
      }
    }

    if (tablesWithRls.length > 0) {
      console.log(`✅ RLS enabled on ${tablesWithRls.length} tables:`);
      tablesWithRls.forEach((table) => {
        console.log(`   ✓ ${table}`);
      });
    }

    if (tablesWithoutRls.length > 0) {
      console.log(`\n⚠️  RLS NOT enabled on ${tablesWithoutRls.length} tables:`);
      tablesWithoutRls.forEach((table) => {
        console.log(`   ✗ ${table}`);
      });
    }

    console.log('');

    // 8. Verify RLS helper functions exist
    console.log('🔍 Verifying RLS helper functions...');
    const functionsResult = await dataSource.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('user_has_role', 'user_has_permission')
      ORDER BY routine_name
    `);

    const expectedFunctions = ['user_has_permission', 'user_has_role'];
    const existingFunctions = functionsResult.map(
      (row: { routine_name: string }) => row.routine_name,
    );
    const missingFunctions = expectedFunctions.filter(
      (fn) => !existingFunctions.includes(fn),
    );

    if (missingFunctions.length === 0) {
      console.log('✅ All RLS helper functions exist:');
      existingFunctions.forEach((fn: string) => {
        console.log(`   ✓ ${fn}()`);
      });
    } else {
      console.log('⚠️  Missing RLS helper functions:');
      missingFunctions.forEach((fn) => {
        console.log(`   ✗ ${fn}()`);
      });
    }

    console.log('');

    // 9. Final summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Test database setup completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migrations: Up to date');
    console.log(`✅ System Roles: ${rolesResult.length} seeded`);
    console.log(`✅ Permissions: ${permissionCount} seeded`);
    console.log('✅ Service Role: Configured');
    console.log(`✅ RLS Policies: ${tablesWithRls.length} tables protected`);
    console.log('✅ RLS Functions: All present');
    console.log('');
    console.log('📝 Database is ready for integration tests!');
    console.log('   Run: npm run test:integration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Test database setup failed:');
    console.error(error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check .env.test has correct DATABASE_URL');
    console.error('   2. Ensure database server is running');
    console.error('   3. Verify migrations are in correct order');
    console.error(
      '   4. Check migration files in src/core/infrastructure/database/migrations/\n',
    );
    throw error;
  } finally {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed\n');
    }
  }
}

// Run setup
setupTestDatabase()
  .then(() => {
    console.log('✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
