import { DataSource } from 'typeorm';
import { getTestDataSourceOptions } from '../config/test-datasource';
import { runInTransaction } from '../../src/core/infrastructure/database/rls.storage';

let dataSource: DataSource | null = null;

/**
 * Initialize PostgreSQL Test Database (Render Staging)
 *
 * - Connects to PostgreSQL staging database on Render
 * - AUTOMATICALLY runs pending migrations to ensure schema is up-to-date
 * - Handles RLS policies and foreign key constraints
 * - Singleton pattern to avoid multiple connections
 */
export async function initializeTestDatabase(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  try {
    // Create new DataSource instance directly
    dataSource = new DataSource(getTestDataSourceOptions());

    // Connect to database
    await dataSource.initialize();
    console.log('✅ Test database connected (Render Staging)');

    // AUTO-RUN MIGRATIONS: Ensure schema is always up-to-date
    const pendingMigrations = await dataSource.showMigrations();
    if (pendingMigrations) {
      console.log('📦 Running pending migrations...');
      const executedMigrations = await dataSource.runMigrations({
        transaction: 'all',
      });

      if (executedMigrations.length > 0) {
        console.log(
          `✅ Ran ${executedMigrations.length} migration(s) successfully`,
        );
      }
    }

    // Verify database state
    const rolesCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM roles',
    );
    console.log(`📊 Seed roles in database: ${rolesCount[0].count}`);

    // Ensure critical roles exist
    if (rolesCount[0].count === 0) {
      throw new Error(
        '❌ Database not seeded! Migrations may have failed. Run: npm run test:setup-db',
      );
    }

    return dataSource;
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clear All Test Data (PostgreSQL Strategy with RLS Support)
 *
 * Strategy: DELETE from test data tables in correct FK order, preserve seed data
 * - Respects foreign key constraints by deleting in correct order
 * - Preserves RLS policies and schema structure
 * - IMPORTANT: Does NOT delete seed/fixture data (roles, permissions, role_permissions)
 * - Uses DELETE instead of TRUNCATE to avoid CASCADE issues with seed data
 * - Runs in service role context to bypass RLS policies during cleanup
 * - Idempotent: Safe to run multiple times without errors
 */
export async function clearDatabase(): Promise<void> {
  if (!dataSource?.isInitialized) {
    console.warn('⚠️  Database not initialized, skipping cleanup');
    return;
  }

  try {
    // Wrap entire cleanup in service role context (bypasses RLS for DELETE)
    await runAsServiceRole(async () => {
      // Verify roles exist BEFORE cleanup
      const rolesBeforeCount = await dataSource!.query(
        'SELECT COUNT(*) as count FROM roles WHERE is_system_role = true',
      );

      // Delete test data in correct order to respect FK constraints
      // Order: Child tables first, parent tables last
      // CRITICAL: We delete ONLY test data, NEVER seed data (roles, permissions, role_permissions)
      const testDataTables = [
        'user_roles', // References users, roles, organizations
        'sessions', // References users
        'users', // References nothing (can have self-FK but optional)
        'organizations', // Can have self-FK to parent
      ];

      let deletedCount = 0;
      let totalRowsDeleted = 0;

      for (const table of testDataTables) {
        // More robust cleanup: exclude service role user and seed data
        const result = await dataSource!.query(`
          DELETE FROM "${table}"
          WHERE id IS NOT NULL
            AND id != '00000000-0000-0000-0000-000000000000'
            ${table === 'users' ? "AND supabase_user_id != '00000000-0000-0000-0000-000000000001'" : ''};
        `);

        const rowsDeleted = result[1] || 0;
        if (rowsDeleted > 0) {
          deletedCount++;
          totalRowsDeleted += rowsDeleted;
        }
      }

      // Verify roles still exist AFTER cleanup
      const rolesAfterCount = await dataSource!.query(
        'SELECT COUNT(*) as count FROM roles WHERE is_system_role = true',
      );

      if (rolesBeforeCount[0].count !== rolesAfterCount[0].count) {
        throw new Error(
          `❌ CRITICAL: System roles were deleted during cleanup! Before: ${rolesBeforeCount[0].count}, After: ${rolesAfterCount[0].count}`,
        );
      }

      // Verify service role user still exists
      const serviceUserCount = await dataSource!.query(
        `SELECT COUNT(*) as count FROM users WHERE supabase_user_id = '00000000-0000-0000-0000-000000000001'`,
      );

      if (serviceUserCount[0].count === 0) {
        throw new Error(
          '❌ CRITICAL: Service role user was deleted during cleanup!',
        );
      }

      console.log(
        `🧹 Cleared ${deletedCount} test data tables (${totalRowsDeleted} rows)`,
      );
    });
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw error;
  }
}

/**
 * Close Database Connection
 *
 * Called after all tests complete (in global teardown or afterAll)
 */
export async function closeDatabase(): Promise<void> {
  if (dataSource?.isInitialized) {
    try {
      await dataSource.destroy();
      dataSource = null;
      console.log('✅ Test database connection closed');
    } catch (error) {
      console.error('❌ Failed to close database:', error);
      throw error;
    }
  }
}

/**
 * Get Active DataSource
 *
 * Returns the initialized test database connection
 */
export function getTestDataSource(): DataSource {
  if (!dataSource?.isInitialized) {
    throw new Error(
      'Test database not initialized. Call initializeTestDatabase() first.',
    );
  }
  return dataSource;
}

/**
 * Ensure Seed Roles Exist (Safety Mechanism)
 *
 * Verifies that critical seed roles exist in the database.
 * If missing, throws an error indicating migration or seed issues.
 * Call this in beforeAll() hooks to catch seed data problems early.
 */
export async function ensureSeedRolesExist(): Promise<void> {
  if (!dataSource?.isInitialized) {
    throw new Error('Database not initialized');
  }

  try {
    const rolesCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM roles',
    );

    const count = parseInt(rolesCount[0].count, 10);

    if (count === 0) {
      throw new Error(
        '❌ No roles found in database! Run migrations with: npm run test:migrate',
      );
    }

    // Verify critical roles exist (using lowercase values from migration)
    const criticalRoles = ['super_admin', 'admin', 'gestor', 'colaborador'];
    const existingRoles = await dataSource.query(
      `SELECT name FROM roles WHERE name = ANY($1)`,
      [criticalRoles],
    );

    const existingRoleNames = existingRoles.map(
      (r: { name: string }) => r.name,
    );
    const missingRoles = criticalRoles.filter(
      (name) => !existingRoleNames.includes(name),
    );

    if (missingRoles.length > 0) {
      throw new Error(
        `❌ Missing critical roles: ${missingRoles.join(', ')}. Run migrations with: npm run test:migrate`,
      );
    }
  } catch (error) {
    console.error('❌ Seed role verification failed:', error);
    throw error;
  }
}

/**
 * Run callback in RLS Context
 *
 * Simulates an authenticated request by setting the claim variable in a transaction.
 * Uses parameterized queries to prevent SQL injection.
 */
export async function runInRlsContext<T>(
  userId: string,
  callback: () => Promise<T>,
): Promise<T> {
  const ds = getTestDataSource();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Set RLS context with parameterized query (prevents SQL injection)
    await queryRunner.query(
      `SELECT set_config('request.jwt.claim.sub', $1, true)`,
      [userId],
    );

    const result = await runInTransaction(queryRunner.manager, callback);

    await queryRunner.commitTransaction();
    return result;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Service Role UUID for RLS Bypass
 *
 * Special UUID that allows bypassing RLS policies during test fixture creation.
 * This service role user is created by the AddServiceRoleRlsPolicies migration.
 *
 * UUID: 00000000-0000-0000-0000-000000000001 (distinct from regular user UUIDs)
 */
const SERVICE_ROLE_UUID = '00000000-0000-0000-0000-000000000001';

/**
 * Run database operations as service role (bypasses RLS)
 *
 * ⚠️ WARNING: Use ONLY for fixture creation, NEVER for business logic assertions
 *
 * @example
 * // ✅ CORRECT: Fixture creation
 * const user = await runAsServiceRole(async () => {
 *   return userRepository.save(createUserFixture({
 *     email: 'test@example.com',
 *     supabaseUserId: 'test-uuid-123',
 *   }));
 * });
 *
 * @example
 * // ❌ WRONG: Business logic (defeats RLS testing purpose)
 * await runAsServiceRole(async () => {
 *   const users = await userRepository.find();
 *   expect(users).toHaveLength(1); // Don't do this
 * });
 *
 * @param callback Function to execute with service role privileges
 * @returns Result of the callback function
 */
export async function runAsServiceRole<T>(
  callback: () => Promise<T>,
): Promise<T> {
  return runInRlsContext(SERVICE_ROLE_UUID, callback);
}
