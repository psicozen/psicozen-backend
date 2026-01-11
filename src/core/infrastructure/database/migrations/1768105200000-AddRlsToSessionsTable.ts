import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRlsToSessionsTable1768105200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable Row Level Security (RLS)
    await queryRunner.query(`
      ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
    `);

    // 2. Create RLS Policies for SELECT
    await queryRunner.query(`
      -- Policy: Users can view their own sessions
      CREATE POLICY sessions_select_own_policy ON sessions
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = sessions.user_id
          )
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins can view all sessions
      CREATE POLICY sessions_select_admin_policy ON sessions
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    // 3. Create RLS Policy for INSERT
    await queryRunner.query(`
      -- Policy: Users can create their own sessions (login)
      CREATE POLICY sessions_insert_own_policy ON sessions
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = sessions.user_id
          )
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins can create sessions for any user
      CREATE POLICY sessions_insert_admin_policy ON sessions
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    // 4. Create RLS Policy for UPDATE
    await queryRunner.query(`
      -- Policy: Users can update their own sessions (refresh token)
      CREATE POLICY sessions_update_own_policy ON sessions
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = sessions.user_id
          )
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins can update any session
      CREATE POLICY sessions_update_admin_policy ON sessions
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    // 5. Create RLS Policy for DELETE
    await queryRunner.query(`
      -- Policy: Users can delete their own sessions (logout)
      CREATE POLICY sessions_delete_own_policy ON sessions
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = sessions.user_id
          )
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins can delete any session
      CREATE POLICY sessions_delete_admin_policy ON sessions
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_delete_admin_policy ON sessions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_delete_own_policy ON sessions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_update_admin_policy ON sessions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_update_own_policy ON sessions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_insert_admin_policy ON sessions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_insert_own_policy ON sessions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_select_admin_policy ON sessions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS sessions_select_own_policy ON sessions;`);

    // Disable RLS
    await queryRunner.query(`ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;`);
  }
}
