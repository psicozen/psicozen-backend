import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRlsToUsersTable1768105100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable Row Level Security (RLS)
    await queryRunner.query(`
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    `);

    // 2. Ensure helper functions exist (reusable across tables)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_role_name TEXT)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p_user_id
            AND r.name = p_role_name
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id UUID, p_permission_name TEXT)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = p_user_id
            AND p.name = p_permission_name
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 3. Create RLS Policies for SELECT
    await queryRunner.query(`
      -- Policy: Users can view their own profile
      CREATE POLICY users_select_own_policy ON users
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = users.id
          )
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins can view all users
      CREATE POLICY users_select_admin_policy ON users
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

    await queryRunner.query(`
      -- Policy: Users with 'users:read' permission can view all users
      CREATE POLICY users_select_permission_policy ON users
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_permission(u.id, 'users:read')
          )
        );
    `);

    // 4. Create RLS Policy for INSERT
    await queryRunner.query(`
      -- Policy: Only admins or users with 'users:create' permission can insert
      CREATE POLICY users_insert_policy ON users
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                public.user_has_role(u.id, 'admin')
                OR public.user_has_permission(u.id, 'users:create')
              )
          )
        );
    `);

    // 5. Create RLS Policy for UPDATE
    await queryRunner.query(`
      -- Policy: Users can update their own profile
      CREATE POLICY users_update_own_policy ON users
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = users.id
          )
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins or users with 'users:update' permission can update any user
      CREATE POLICY users_update_admin_policy ON users
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                public.user_has_role(u.id, 'admin')
                OR public.user_has_permission(u.id, 'users:update')
              )
          )
        );
    `);

    // 6. Create RLS Policy for DELETE
    await queryRunner.query(`
      -- Policy: Only admins or users with 'users:delete' permission can delete
      CREATE POLICY users_delete_policy ON users
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                public.user_has_role(u.id, 'admin')
                OR public.user_has_permission(u.id, 'users:delete')
              )
          )
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS users_delete_policy ON users;`);
    await queryRunner.query(`DROP POLICY IF EXISTS users_update_admin_policy ON users;`);
    await queryRunner.query(`DROP POLICY IF EXISTS users_update_own_policy ON users;`);
    await queryRunner.query(`DROP POLICY IF EXISTS users_insert_policy ON users;`);
    await queryRunner.query(`DROP POLICY IF EXISTS users_select_permission_policy ON users;`);
    await queryRunner.query(`DROP POLICY IF EXISTS users_select_admin_policy ON users;`);
    await queryRunner.query(`DROP POLICY IF EXISTS users_select_own_policy ON users;`);

    // Disable RLS
    await queryRunner.query(`ALTER TABLE users DISABLE ROW LEVEL SECURITY;`);

    // Note: We don't drop helper functions as they might be used by other tables
  }
}
