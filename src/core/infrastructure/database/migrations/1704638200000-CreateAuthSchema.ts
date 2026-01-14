import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Auth Schema and auth.uid() Function
 *
 * This migration creates the `auth` schema and the `auth.uid()` function
 * to simulate Supabase's authentication context in standalone PostgreSQL.
 *
 * **Why This Is Needed:**
 * - Supabase provides `auth.uid()` automatically to get the authenticated user's UUID
 * - When using TypeORM directly with PostgreSQL (not through Supabase), this function doesn't exist
 * - RLS policies depend on `auth.uid()` to identify the current user
 *
 * **How It Works:**
 * - Creates an `auth` schema (matches Supabase's structure)
 * - `auth.uid()` reads from `request.jwt.claim.sub` session variable
 * - RLS middleware sets this variable via `SET LOCAL request.jwt.claim.sub = 'user-uuid'`
 * - Tests use `runInRlsContext()` to set this variable before database operations
 *
 * **CRITICAL:** This migration MUST run BEFORE any RLS policy migrations (1768105*)
 *
 * **Timestamp:** 1704638200000 - Runs before CreateUsersTable (1704638300000)
 */
export class CreateAuthSchema1704638200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // CHECK IF USING SUPABASE OR STANDALONE POSTGRESQL
    // ========================================

    // Check if auth schema already exists (Supabase provides it)
    const authSchemaExists = await queryRunner.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'auth';
    `);

    // Check if auth.uid() function already exists (Supabase provides it)
    const authUidExists = await queryRunner.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'auth'
        AND routine_name = 'uid';
    `);

    // ========================================
    // CASE 1: SUPABASE (auth schema & auth.uid() already exist)
    // ========================================

    if (authSchemaExists.length > 0 && authUidExists.length > 0) {
      console.log(
        '✅ Detected Supabase environment - auth.uid() already exists, skipping creation',
      );
      // Supabase provides auth.uid() that reads from request.jwt.claim.sub
      // No action needed - Supabase's implementation is correct!
      return;
    }

    // ========================================
    // CASE 2: STANDALONE POSTGRESQL (need to create auth.uid())
    // ========================================

    console.log(
      '⚙️  Detected standalone PostgreSQL - creating auth.uid() function',
    );

    // STEP 1: CREATE AUTH SCHEMA
    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS auth;
    `);

    // STEP 2: CREATE auth.uid() FUNCTION
    // This polyfill matches Supabase's auth.uid() behavior
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION auth.uid()
      RETURNS UUID AS $$
      BEGIN
        RETURN coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
        )::uuid;
      EXCEPTION
        WHEN invalid_text_representation THEN
          RETURN NULL;
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    // STEP 3: GRANT PERMISSIONS
    await queryRunner.query(`
      GRANT USAGE ON SCHEMA auth TO PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
    `);

    console.log('✅ auth.uid() function created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // ROLLBACK: DROP FUNCTION AND SCHEMA
    // ========================================

    // Drop function first (must be done before dropping schema)
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS auth.uid();
    `);

    // Drop schema (CASCADE will drop any remaining objects)
    await queryRunner.query(`
      DROP SCHEMA IF EXISTS auth CASCADE;
    `);
  }
}
