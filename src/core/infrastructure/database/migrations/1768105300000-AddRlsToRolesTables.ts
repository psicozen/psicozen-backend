import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRlsToRolesTables1768105300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // ROLES TABLE
    // ========================================

    // 1. Enable RLS for roles
    await queryRunner.query(`
      ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
    `);

    // 2. RLS Policies for roles - SELECT
    await queryRunner.query(`
      -- Policy: Authenticated users can view all roles
      CREATE POLICY roles_select_policy ON roles
        FOR SELECT
        USING (
          auth.uid() IS NOT NULL
        );
    `);

    // 3. RLS Policies for roles - INSERT/UPDATE/DELETE (admin only)
    await queryRunner.query(`
      -- Policy: Only admins can insert roles
      CREATE POLICY roles_insert_policy ON roles
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

    await queryRunner.query(`
      -- Policy: Only admins can update roles
      CREATE POLICY roles_update_policy ON roles
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

    await queryRunner.query(`
      -- Policy: Only admins can delete roles
      CREATE POLICY roles_delete_policy ON roles
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

    // ========================================
    // PERMISSIONS TABLE
    // ========================================

    // 4. Enable RLS for permissions
    await queryRunner.query(`
      ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
    `);

    // 5. RLS Policies for permissions - SELECT
    await queryRunner.query(`
      -- Policy: Authenticated users can view all permissions
      CREATE POLICY permissions_select_policy ON permissions
        FOR SELECT
        USING (
          auth.uid() IS NOT NULL
        );
    `);

    // 6. RLS Policies for permissions - INSERT/UPDATE/DELETE (admin only)
    await queryRunner.query(`
      -- Policy: Only admins can insert permissions
      CREATE POLICY permissions_insert_policy ON permissions
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

    await queryRunner.query(`
      -- Policy: Only admins can update permissions
      CREATE POLICY permissions_update_policy ON permissions
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

    await queryRunner.query(`
      -- Policy: Only admins can delete permissions
      CREATE POLICY permissions_delete_policy ON permissions
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

    // ========================================
    // ROLE_PERMISSIONS TABLE
    // ========================================

    // 7. Enable RLS for role_permissions
    await queryRunner.query(`
      ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
    `);

    // 8. RLS Policies for role_permissions - SELECT
    await queryRunner.query(`
      -- Policy: Authenticated users can view all role-permission mappings
      CREATE POLICY role_permissions_select_policy ON role_permissions
        FOR SELECT
        USING (
          auth.uid() IS NOT NULL
        );
    `);

    // 9. RLS Policies for role_permissions - INSERT/UPDATE/DELETE (admin only)
    await queryRunner.query(`
      -- Policy: Only admins can insert role-permission mappings
      CREATE POLICY role_permissions_insert_policy ON role_permissions
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

    await queryRunner.query(`
      -- Policy: Only admins can delete role-permission mappings
      CREATE POLICY role_permissions_delete_policy ON role_permissions
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

    // ========================================
    // USER_ROLES TABLE
    // ========================================

    // 10. Enable RLS for user_roles
    await queryRunner.query(`
      ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
    `);

    // 11. RLS Policies for user_roles - SELECT
    await queryRunner.query(`
      -- Policy: Users can view their own roles
      CREATE POLICY user_roles_select_own_policy ON user_roles
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = user_roles.user_id
          )
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins can view all user roles
      CREATE POLICY user_roles_select_admin_policy ON user_roles
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

    // 12. RLS Policies for user_roles - INSERT/UPDATE/DELETE (admin only)
    await queryRunner.query(`
      -- Policy: Only admins can assign roles to users
      CREATE POLICY user_roles_insert_policy ON user_roles
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

    await queryRunner.query(`
      -- Policy: Only admins can delete user role assignments
      CREATE POLICY user_roles_delete_policy ON user_roles
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
    // Drop user_roles policies
    await queryRunner.query(`DROP POLICY IF EXISTS user_roles_delete_policy ON user_roles;`);
    await queryRunner.query(`DROP POLICY IF EXISTS user_roles_insert_policy ON user_roles;`);
    await queryRunner.query(`DROP POLICY IF EXISTS user_roles_select_admin_policy ON user_roles;`);
    await queryRunner.query(`DROP POLICY IF EXISTS user_roles_select_own_policy ON user_roles;`);
    await queryRunner.query(`ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;`);

    // Drop role_permissions policies
    await queryRunner.query(`DROP POLICY IF EXISTS role_permissions_delete_policy ON role_permissions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS role_permissions_insert_policy ON role_permissions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS role_permissions_select_policy ON role_permissions;`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;`);

    // Drop permissions policies
    await queryRunner.query(`DROP POLICY IF EXISTS permissions_delete_policy ON permissions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS permissions_update_policy ON permissions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS permissions_insert_policy ON permissions;`);
    await queryRunner.query(`DROP POLICY IF EXISTS permissions_select_policy ON permissions;`);
    await queryRunner.query(`ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;`);

    // Drop roles policies
    await queryRunner.query(`DROP POLICY IF EXISTS roles_delete_policy ON roles;`);
    await queryRunner.query(`DROP POLICY IF EXISTS roles_update_policy ON roles;`);
    await queryRunner.query(`DROP POLICY IF EXISTS roles_insert_policy ON roles;`);
    await queryRunner.query(`DROP POLICY IF EXISTS roles_select_policy ON roles;`);
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY;`);
  }
}
