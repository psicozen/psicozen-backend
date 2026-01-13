import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Migration to add organization scope to RBAC tables.
 *
 * Changes:
 * - Adds organization_id column to user_roles table (nullable for global roles like SUPER_ADMIN)
 * - Updates unique index to include organization_id
 * - Creates helper functions for organization-scoped role checks
 */
export class AddOrganizationScopeToRBACTables1768105400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add organization_id column to user_roles table
    await queryRunner.addColumn(
      'user_roles',
      new TableColumn({
        name: 'organization_id',
        type: 'uuid',
        isNullable: true, // Nullable for global roles (e.g., SUPER_ADMIN)
      }),
    );

    // 2. Drop old unique index
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_unique');

    // 3. Create new unique index including organization_id
    // This allows a user to have the same role in different organizations
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_unique',
        columnNames: ['user_id', 'role_id', 'organization_id'],
        isUnique: true,
      }),
    );

    // 4. Create index for organization_id for faster queries
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // 5. Create foreign key to organizations table
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'FK_user_roles_organization',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 6. Create helper function to check if user has role in organization
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.user_has_role_in_organization(
        p_user_id UUID,
        p_organization_id UUID,
        p_role_name TEXT
      )
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p_user_id
            AND r.name = p_role_name
            AND (
              ur.organization_id = p_organization_id
              OR ur.organization_id IS NULL  -- Global roles apply everywhere
            )
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 7. Create helper function to get user roles in organization
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.get_user_roles_in_organization(
        p_user_id UUID,
        p_organization_id UUID
      )
      RETURNS TABLE(role_name TEXT) AS $$
      BEGIN
        RETURN QUERY
        SELECT r.name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND (
            ur.organization_id = p_organization_id
            OR ur.organization_id IS NULL  -- Include global roles
          );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 8. Create helper function to check if user has permission in organization
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.user_has_permission_in_organization(
        p_user_id UUID,
        p_organization_id UUID,
        p_permission_name TEXT
      )
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
          JOIN permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = p_user_id
            AND p.name = p_permission_name
            AND (
              ur.organization_id = p_organization_id
              OR ur.organization_id IS NULL  -- Global roles apply everywhere
            )
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 9. Update organizations RLS policies to use organization-scoped checks
    // Drop existing admin policy and create new one with organization scope
    await queryRunner.query(`
      DROP POLICY IF EXISTS organizations_select_admin_policy ON organizations;
    `);

    await queryRunner.query(`
      CREATE POLICY organizations_select_admin_policy ON organizations
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                public.user_has_role(u.id, 'super_admin')
                OR public.user_has_role_in_organization(u.id, organizations.id, 'admin')
                OR public.user_has_role_in_organization(u.id, organizations.id, 'owner')
              )
          )
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Revert organizations RLS policy
    await queryRunner.query(`
      DROP POLICY IF EXISTS organizations_select_admin_policy ON organizations;
    `);

    await queryRunner.query(`
      CREATE POLICY organizations_select_admin_policy ON organizations
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

    // 2. Drop helper functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS public.user_has_permission_in_organization(UUID, UUID, TEXT);
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS public.get_user_roles_in_organization(UUID, UUID);
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS public.user_has_role_in_organization(UUID, UUID, TEXT);
    `);

    // 3. Drop foreign key
    await queryRunner.dropForeignKey(
      'user_roles',
      'FK_user_roles_organization',
    );

    // 4. Drop organization_id index
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_organization_id');

    // 5. Drop new unique index
    await queryRunner.dropIndex('user_roles', 'IDX_user_roles_unique');

    // 6. Recreate original unique index
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_unique',
        columnNames: ['user_id', 'role_id'],
        isUnique: true,
      }),
    );

    // 7. Drop organization_id column
    await queryRunner.dropColumn('user_roles', 'organization_id');
  }
}
