import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add Service Role RLS Policies
 *
 * Purpose: Enable test infrastructure to bypass RLS policies for fixture creation
 *
 * What this migration does:
 * 1. Creates a special service role user with UUID 'service-role-bypass'
 * 2. Adds RLS policies to ALL tables that allow this service role to bypass restrictions
 * 3. Enables tests to create fixtures without RLS errors while maintaining security
 *
 * Security Note:
 * - Service role is ONLY for test fixture creation
 * - Production code never uses this role
 * - Business logic tests still enforce RLS via user context
 *
 * Tables with RLS policies (as of 2024-01-10):
 * - users (via AddRlsToUsersTable migration)
 * - sessions (via AddRlsToSessionsTable migration)
 * - roles, permissions, role_permissions, user_roles (via AddRlsToRolesTables migration)
 * - organizations (via CreateOrganizationsTable migration)
 */
export class AddServiceRoleRlsPolicies1768105500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create service role user in users table
    // This user represents the "service role" context for test fixtures
    // Using UUID 00000000-0000-0000-0000-000000000001 as supabase_user_id
    await queryRunner.query(`
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

    // 2. Add service role policies to ALL tables with RLS enabled
    const tables = [
      'users',
      'sessions',
      'roles',
      'permissions',
      'role_permissions',
      'user_roles',
      'organizations',
    ];

    for (const table of tables) {
      // Create policy that allows service role to bypass ALL RLS restrictions
      // USING clause: Controls which rows are visible for SELECT
      // WITH CHECK clause: Controls which rows can be INSERT/UPDATE/DELETE
      await queryRunner.query(`
        CREATE POLICY ${table}_service_role_policy ON ${table}
          FOR ALL
          USING (
            current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000001'
          )
          WITH CHECK (
            current_setting('request.jwt.claim.sub', true) = '00000000-0000-0000-0000-000000000001'
          );
      `);
    }

    console.log('✅ Service role RLS policies added successfully');
    console.log('   Service role user created: service-role-bypass');
    console.log(`   Policies added to ${tables.length} tables`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop service role policies from all tables
    const tables = [
      'users',
      'sessions',
      'roles',
      'permissions',
      'role_permissions',
      'user_roles',
      'organizations',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        DROP POLICY IF EXISTS ${table}_service_role_policy ON ${table};
      `);
    }

    // 2. Delete service role user
    // Note: We delete BEFORE dropping policies to ensure deletion succeeds
    await queryRunner.query(`
      DELETE FROM users
      WHERE supabase_user_id = '00000000-0000-0000-0000-000000000001';
    `);

    console.log('✅ Service role RLS policies removed successfully');
  }
}
