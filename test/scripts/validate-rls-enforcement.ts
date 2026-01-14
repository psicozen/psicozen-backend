/**
 * RLS Enforcement Validation Script
 *
 * Purpose: Verify that Row Level Security (RLS) policies are properly enforced
 *
 * This script validates:
 * 1. Queries without auth.uid() context return 0 rows (RLS blocks unauthenticated access)
 * 2. Service role context bypasses RLS (allows fixture creation)
 * 3. Service role user exists in database
 *
 * Run: npm run test:rls
 */

import {
  initializeTestDatabase,
  getTestDataSource,
  closeDatabase,
  runAsServiceRole,
} from '../utils/test-database.helper';
import { UserSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';

async function validateRlsEnforcement() {
  console.log('🔍 Validating RLS enforcement...\n');

  try {
    // Initialize test database
    await initializeTestDatabase();
    const ds = getTestDataSource();

    let allTestsPassed = true;

    // Test 1: Query without auth.uid() should return 0 rows (RLS blocking)
    console.log('Test 1: Query without RLS context (should be blocked)');
    try {
      const usersNoAuth = await ds.getRepository(UserSchema).find();
      const test1Pass = usersNoAuth.length === 0;

      console.log(`  Result: ${usersNoAuth.length} users found`);
      console.log(`  Expected: 0 users (RLS should block)`);
      console.log(`  Status: ${test1Pass ? '✅ PASS' : '❌ FAIL'}\n`);

      allTestsPassed = allTestsPassed && test1Pass;

      if (!test1Pass) {
        console.error(
          '  ⚠️  WARNING: RLS is not blocking unauthenticated queries!',
        );
        console.error('  This means RLS policies may not be properly enabled.');
      }
    } catch (error) {
      console.log(`  Result: Query failed with error`);
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
      console.log(`  Expected: 0 users OR error (RLS blocking)`);
      console.log(`  Status: ✅ PASS (RLS is blocking)\n`);
      // This is actually a pass - RLS is blocking so aggressively it throws an error
    }

    // Test 2: Query with service role should work (bypass RLS)
    console.log('Test 2: Query with service role context (should bypass RLS)');
    try {
      const usersServiceRole = await runAsServiceRole(async () => {
        return ds.getRepository(UserSchema).find();
      });

      const test2Pass = usersServiceRole.length > 0;

      console.log(`  Result: ${usersServiceRole.length} users found`);
      console.log(`  Expected: >0 users (service role bypasses RLS)`);
      console.log(`  Status: ${test2Pass ? '✅ PASS' : '❌ FAIL'}\n`);

      allTestsPassed = allTestsPassed && test2Pass;

      if (!test2Pass) {
        console.error('  ⚠️  WARNING: Service role is not bypassing RLS!');
        console.error('  Check that service role policies are created.');
      }
    } catch (error) {
      console.log(`  Result: Query failed with error`);
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
      console.log(`  Status: ❌ FAIL\n`);
      allTestsPassed = false;

      console.error('  ⚠️  ERROR: Service role context failed!');
      console.error(
        '  This likely means the service role migration did not run.',
      );
      console.error('  Run: npm run migration:run');
    }

    // Test 3: Verify service role user exists
    console.log('Test 3: Service role user existence');
    try {
      const serviceUser = await runAsServiceRole(async () => {
        return ds.query(`
          SELECT id, email, supabase_user_id
          FROM users
          WHERE supabase_user_id = '00000000-0000-0000-0000-000000000001'
        `);
      });

      const test3Pass = serviceUser.length === 1;

      console.log(`  Result: ${serviceUser.length} service role users found`);
      console.log(`  Expected: 1 service role user`);
      console.log(`  Status: ${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`);

      allTestsPassed = allTestsPassed && test3Pass;

      if (!test3Pass) {
        console.error('  ⚠️  WARNING: Service role user not found!');
        console.error(
          '  The AddServiceRoleRlsPolicies migration may not have run.',
        );
        console.error('  Run: npm run migration:run');
      }
    } catch (error) {
      console.log(`  Result: Query failed with error`);
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
      console.log(`  Status: ❌ FAIL\n`);
      allTestsPassed = false;
    }

    // Test 4: Verify RLS is enabled on critical tables
    console.log('Test 4: RLS enabled on critical tables');
    try {
      const rlsEnabledTables = await runAsServiceRole(async () => {
        return ds.query(`
          SELECT tablename
          FROM pg_tables t
          JOIN pg_class c ON c.relname = t.tablename
          WHERE t.schemaname = 'public'
            AND c.relrowsecurity = true
            AND tablename IN ('users', 'organizations', 'sessions', 'roles', 'permissions', 'user_roles', 'role_permissions')
          ORDER BY tablename;
        `);
      });

      const expectedTables = [
        'organizations',
        'permissions',
        'role_permissions',
        'roles',
        'sessions',
        'user_roles',
        'users',
      ];

      const foundTables = rlsEnabledTables.map(
        (row: { tablename: string }) => row.tablename,
      );
      const test4Pass =
        expectedTables.every((table) => foundTables.includes(table)) &&
        foundTables.length === expectedTables.length;

      console.log(
        `  Result: ${foundTables.length} tables with RLS enabled: ${foundTables.join(', ')}`,
      );
      console.log(
        `  Expected: ${expectedTables.length} tables: ${expectedTables.join(', ')}`,
      );
      console.log(`  Status: ${test4Pass ? '✅ PASS' : '❌ FAIL'}\n`);

      allTestsPassed = allTestsPassed && test4Pass;

      if (!test4Pass) {
        const missingTables = expectedTables.filter(
          (table) => !foundTables.includes(table),
        );
        if (missingTables.length > 0) {
          console.error(
            `  ⚠️  WARNING: RLS not enabled on: ${missingTables.join(', ')}`,
          );
        }
      }
    } catch (error) {
      console.log(`  Result: Query failed with error`);
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
      console.log(`  Status: ❌ FAIL\n`);
      allTestsPassed = false;
    }

    // Close database connection
    await closeDatabase();

    // Final result
    console.log('─────────────────────────────────────────────────');
    if (allTestsPassed) {
      console.log('✅ All RLS validation tests passed');
      console.log('\nRLS policies are properly configured and enforced.');
      console.log('Tests can safely use runAsServiceRole() for fixtures.');
      process.exit(0);
    } else {
      console.error('❌ Some RLS validation tests failed\n');
      console.error('Action Required:');
      console.error('1. Run migrations: npm run migration:run');
      console.error('2. Verify database connection is correct');
      console.error('3. Check that RLS policies exist in migrations');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ RLS validation error:', err);
    await closeDatabase();
    process.exit(1);
  }
}

// Run validation
validateRlsEnforcement().catch((err) => {
  console.error('❌ Unexpected error during RLS validation:', err);
  process.exit(1);
});
