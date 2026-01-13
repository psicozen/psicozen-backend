import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddOrganizationScopeToRBACTables1768105400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // STEP 1: ADD COLUMNS TO ROLES TABLE
    // ========================================

    // Add organization_id column (nullable for system roles)
    await queryRunner.addColumn(
      'roles',
      new TableColumn({
        name: 'organization_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add hierarchy_level column
    await queryRunner.addColumn(
      'roles',
      new TableColumn({
        name: 'hierarchy_level',
        type: 'integer',
        isNullable: false,
        default: 100,
      }),
    );

    // Add is_system_role column
    await queryRunner.addColumn(
      'roles',
      new TableColumn({
        name: 'is_system_role',
        type: 'boolean',
        default: false,
      }),
    );

    // ========================================
    // STEP 2: ADD FOREIGN KEY FOR ROLES.ORGANIZATION_ID
    // ========================================

    await queryRunner.createForeignKey(
      'roles',
      new TableForeignKey({
        name: 'FK_roles_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ========================================
    // STEP 3: CREATE INDEXES ON ROLES TABLE
    // ========================================

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'idx_roles_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'idx_roles_hierarchy_level',
        columnNames: ['hierarchy_level'],
      }),
    );

    // ========================================
    // STEP 4: ADD ORGANIZATION_ID TO USER_ROLES
    // ========================================

    await queryRunner.addColumn(
      'user_roles',
      new TableColumn({
        name: 'organization_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add foreign key for user_roles.organization_id
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_user_roles_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ========================================
    // STEP 5: UPDATE UNIQUE CONSTRAINT ON USER_ROLES
    // ========================================

    // Drop existing unique constraint (user_id, role_id)
    await queryRunner.query(`
      ALTER TABLE user_roles
      DROP CONSTRAINT IF EXISTS "UQ_user_roles_user_id_role_id";
    `);

    // Also try alternative constraint name pattern
    await queryRunner.query(`
      ALTER TABLE user_roles
      DROP CONSTRAINT IF EXISTS "user_roles_user_id_role_id_key";
    `);

    // Drop the index that was created with the unique constraint
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_user_roles_user_role";
    `);

    // Add new unique constraint (user_id, role_id, organization_id)
    // Use two partial indexes to properly handle NULL organization_id
    // Index for organization-scoped assignments (organization_id IS NOT NULL)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_roles_user_role_org"
      ON user_roles (user_id, role_id, organization_id)
      WHERE organization_id IS NOT NULL;
    `);

    // Index for system/global role assignments (organization_id IS NULL)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_user_roles_user_role_global"
      ON user_roles (user_id, role_id)
      WHERE organization_id IS NULL;
    `);

    // ========================================
    // STEP 6: CREATE INDEXES ON USER_ROLES
    // ========================================

    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'idx_user_roles_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'idx_user_roles_composite',
        columnNames: ['user_id', 'organization_id'],
      }),
    );

    // ========================================
    // STEP 7: INSERT SYSTEM ROLES
    // ========================================

    // First, check if roles already exist to avoid duplicates
    await queryRunner.query(`
      INSERT INTO roles (name, description, hierarchy_level, is_system_role)
      VALUES
        ('super_admin', 'Super Administrador da Plataforma', 0, true),
        ('admin', 'Administrador da Organização', 100, true),
        ('gestor', 'Gerente de Equipe', 200, true),
        ('colaborador', 'Funcionário', 300, true)
      ON CONFLICT (name) DO UPDATE SET
        hierarchy_level = EXCLUDED.hierarchy_level,
        is_system_role = EXCLUDED.is_system_role;
    `);

    // ========================================
    // STEP 8: UPDATE HELPER FUNCTIONS FOR ORGANIZATION-SCOPED ACCESS
    // ========================================

    // Update user_has_role function to support organization context
    // Simplified logic: system roles apply globally, org roles require org match
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.user_has_role(
        p_user_id UUID,
        p_role_name TEXT,
        p_organization_id UUID DEFAULT NULL
      )
      RETURNS BOOLEAN AS $$
      BEGIN
        -- Case 1: Check for system role (applies globally)
        IF EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p_user_id
            AND r.name = p_role_name
            AND r.is_system_role = true
        ) THEN
          RETURN true;
        END IF;

        -- Case 2: No org specified - check any role match
        IF p_organization_id IS NULL THEN
          RETURN EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND r.name = p_role_name
          );
        END IF;

        -- Case 3: Org specified - check org-scoped role
        RETURN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p_user_id
            AND r.name = p_role_name
            AND ur.organization_id = p_organization_id
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Update user_has_permission function to support organization context
    // Simplified logic: system roles apply globally, org roles require org match
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.user_has_permission(
        p_user_id UUID,
        p_permission_name TEXT,
        p_organization_id UUID DEFAULT NULL
      )
      RETURNS BOOLEAN AS $$
      BEGIN
        -- Case 1: Check permissions from system roles (apply globally)
        IF EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = p_user_id
            AND p.name = p_permission_name
            AND r.is_system_role = true
        ) THEN
          RETURN true;
        END IF;

        -- Case 2: No org specified - check any permission match
        IF p_organization_id IS NULL THEN
          RETURN EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN role_permissions rp ON rp.role_id = ur.role_id
            JOIN permissions p ON p.id = rp.permission_id
            WHERE ur.user_id = p_user_id
              AND p.name = p_permission_name
          );
        END IF;

        -- Case 3: Org specified - check org-scoped permission
        RETURN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = p_user_id
            AND p.name = p_permission_name
            AND ur.organization_id = p_organization_id
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create new helper function to check hierarchy level
    // Returns the minimum (most privileged) hierarchy level for a user
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.user_role_hierarchy_level(
        p_user_id UUID,
        p_organization_id UUID DEFAULT NULL
      )
      RETURNS INTEGER AS $$
      DECLARE
        min_level INTEGER;
      BEGIN
        -- Get minimum hierarchy from system roles (global)
        SELECT MIN(r.hierarchy_level) INTO min_level
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND r.is_system_role = true;

        -- If org specified, also check org-scoped roles
        IF p_organization_id IS NOT NULL THEN
          SELECT LEAST(COALESCE(min_level, 999), COALESCE(MIN(r.hierarchy_level), 999))
          INTO min_level
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p_user_id
            AND ur.organization_id = p_organization_id;
        END IF;

        RETURN COALESCE(min_level, 999);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create helper to check if user is super_admin
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p_user_id
            AND r.name = 'super_admin'
            AND r.is_system_role = true
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // ========================================
    // STEP 9: UPDATE RLS POLICIES FOR ROLES TABLE
    // ========================================

    // Drop existing policies
    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_select_policy ON roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_insert_policy ON roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_update_policy ON roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_delete_policy ON roles;`,
    );

    // Create new SELECT policy - users can see system roles and roles from their organizations
    // Note: System roles have is_system_role=true (organization_id IS NULL is implied)
    await queryRunner.query(`
      CREATE POLICY roles_select_policy ON roles
        FOR SELECT
        USING (
          auth.uid() IS NOT NULL
          AND (
            -- System roles visible to all authenticated users
            is_system_role = true
            -- Or user belongs to the organization that owns the role
            OR EXISTS (
              SELECT 1
              FROM users u
              JOIN user_roles ur ON ur.user_id = u.id
              WHERE u.supabase_user_id = auth.uid()
                AND ur.organization_id = roles.organization_id
            )
            -- Or user is super_admin (can see all)
            OR EXISTS (
              SELECT 1
              FROM users u
              WHERE u.supabase_user_id = auth.uid()
                AND public.is_super_admin(u.id)
            )
          )
        );
    `);

    // Create INSERT policy - super_admin can create any role, org admins can create org roles
    await queryRunner.query(`
      CREATE POLICY roles_insert_policy ON roles
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                -- Super admin can create any role
                public.is_super_admin(u.id)
                -- Org admin can create roles for their org (not system roles)
                OR (
                  roles.is_system_role = false
                  AND roles.organization_id IS NOT NULL
                  AND public.user_has_role(u.id, 'admin', roles.organization_id)
                )
              )
          )
        );
    `);

    // Create UPDATE policy
    await queryRunner.query(`
      CREATE POLICY roles_update_policy ON roles
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                -- Super admin can update any role
                public.is_super_admin(u.id)
                -- Org admin can update non-system roles in their org
                OR (
                  roles.is_system_role = false
                  AND roles.organization_id IS NOT NULL
                  AND public.user_has_role(u.id, 'admin', roles.organization_id)
                )
              )
          )
        );
    `);

    // Create DELETE policy - only super_admin can delete system roles
    await queryRunner.query(`
      CREATE POLICY roles_delete_policy ON roles
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                -- Super admin can delete any role
                public.is_super_admin(u.id)
                -- Org admin can delete non-system roles in their org
                OR (
                  roles.is_system_role = false
                  AND roles.organization_id IS NOT NULL
                  AND public.user_has_role(u.id, 'admin', roles.organization_id)
                )
              )
          )
        );
    `);

    // ========================================
    // STEP 10: UPDATE RLS POLICIES FOR USER_ROLES TABLE
    // ========================================

    // Drop existing policies
    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_select_own_policy ON user_roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_select_admin_policy ON user_roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_insert_policy ON user_roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_delete_policy ON user_roles;`,
    );

    // Users can see their own role assignments
    await queryRunner.query(`
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

    // Super admin and org admins can see role assignments in their scope
    await queryRunner.query(`
      CREATE POLICY user_roles_select_admin_policy ON user_roles
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                -- Super admin sees all
                public.is_super_admin(u.id)
                -- Org admin sees their org's assignments
                OR public.user_has_role(u.id, 'admin', user_roles.organization_id)
                -- Gestor can see their team's assignments
                OR public.user_has_role(u.id, 'gestor', user_roles.organization_id)
              )
          )
        );
    `);

    // Insert policy - hierarchy-based role assignment
    await queryRunner.query(`
      CREATE POLICY user_roles_insert_policy ON user_roles
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM users u
            JOIN roles r ON r.id = user_roles.role_id
            WHERE u.supabase_user_id = auth.uid()
              AND (
                -- Super admin can assign any role
                public.is_super_admin(u.id)
                -- Users can only assign roles with higher hierarchy_level than their own
                OR (
                  public.user_role_hierarchy_level(u.id, user_roles.organization_id) < r.hierarchy_level
                  AND (
                    public.user_has_role(u.id, 'admin', user_roles.organization_id)
                    OR public.user_has_role(u.id, 'gestor', user_roles.organization_id)
                  )
                )
              )
          )
        );
    `);

    // Delete policy - hierarchy-based role removal
    await queryRunner.query(`
      CREATE POLICY user_roles_delete_policy ON user_roles
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            JOIN roles r ON r.id = user_roles.role_id
            WHERE u.supabase_user_id = auth.uid()
              AND (
                -- Super admin can remove any role
                public.is_super_admin(u.id)
                -- Users can only remove roles with higher hierarchy_level than their own
                OR (
                  public.user_role_hierarchy_level(u.id, user_roles.organization_id) < r.hierarchy_level
                  AND (
                    public.user_has_role(u.id, 'admin', user_roles.organization_id)
                    OR public.user_has_role(u.id, 'gestor', user_roles.organization_id)
                  )
                )
              )
          )
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // ROLLBACK: DROP RLS POLICIES FOR USER_ROLES
    // ========================================

    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_delete_policy ON user_roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_insert_policy ON user_roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_select_admin_policy ON user_roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS user_roles_select_own_policy ON user_roles;`,
    );

    // ========================================
    // ROLLBACK: DROP RLS POLICIES FOR ROLES
    // ========================================

    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_delete_policy ON roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_update_policy ON roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_insert_policy ON roles;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS roles_select_policy ON roles;`,
    );

    // ========================================
    // ROLLBACK: RECREATE ORIGINAL RLS POLICIES
    // ========================================

    // Recreate original roles policies
    await queryRunner.query(`
      CREATE POLICY roles_select_policy ON roles
        FOR SELECT
        USING (auth.uid() IS NOT NULL);
    `);

    await queryRunner.query(`
      CREATE POLICY roles_insert_policy ON roles
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    await queryRunner.query(`
      CREATE POLICY roles_update_policy ON roles
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    await queryRunner.query(`
      CREATE POLICY roles_delete_policy ON roles
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    // Recreate original user_roles policies
    await queryRunner.query(`
      CREATE POLICY user_roles_select_own_policy ON user_roles
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND u.id = user_roles.user_id
          )
        );
    `);

    await queryRunner.query(`
      CREATE POLICY user_roles_select_admin_policy ON user_roles
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    await queryRunner.query(`
      CREATE POLICY user_roles_insert_policy ON user_roles
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    await queryRunner.query(`
      CREATE POLICY user_roles_delete_policy ON user_roles
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND public.user_has_role(u.id, 'admin')
          )
        );
    `);

    // ========================================
    // ROLLBACK: DROP HELPER FUNCTIONS
    // ========================================

    await queryRunner.query(
      `DROP FUNCTION IF EXISTS public.is_super_admin(UUID);`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS public.user_role_hierarchy_level(UUID, UUID);`,
    );

    // Restore original helper functions (without organization parameter)
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

    // ========================================
    // ROLLBACK: DELETE SYSTEM ROLES
    // ========================================

    await queryRunner.query(`
      DELETE FROM roles
      WHERE name IN ('super_admin', 'admin', 'gestor', 'colaborador')
        AND is_system_role = true;
    `);

    // ========================================
    // ROLLBACK: DROP INDEXES ON USER_ROLES
    // ========================================

    await queryRunner.dropIndex('user_roles', 'idx_user_roles_composite');
    await queryRunner.dropIndex('user_roles', 'idx_user_roles_organization_id');

    // ========================================
    // ROLLBACK: RESTORE ORIGINAL UNIQUE CONSTRAINT
    // ========================================

    // Drop both partial unique indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_user_roles_user_role_org";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_user_roles_user_role_global";`,
    );

    // Restore original unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_roles_user_role"
      ON user_roles (user_id, role_id);
    `);

    // ========================================
    // ROLLBACK: DROP FK AND COLUMN FROM USER_ROLES
    // ========================================

    await queryRunner.dropForeignKey(
      'user_roles',
      'FK_user_roles_organization_id',
    );
    await queryRunner.dropColumn('user_roles', 'organization_id');

    // ========================================
    // ROLLBACK: DROP INDEXES ON ROLES
    // ========================================

    await queryRunner.dropIndex('roles', 'idx_roles_hierarchy_level');
    await queryRunner.dropIndex('roles', 'idx_roles_organization_id');

    // ========================================
    // ROLLBACK: DROP FK AND COLUMNS FROM ROLES
    // ========================================

    await queryRunner.dropForeignKey('roles', 'FK_roles_organization_id');
    await queryRunner.dropColumn('roles', 'is_system_role');
    await queryRunner.dropColumn('roles', 'hierarchy_level');
    await queryRunner.dropColumn('roles', 'organization_id');
  }
}
