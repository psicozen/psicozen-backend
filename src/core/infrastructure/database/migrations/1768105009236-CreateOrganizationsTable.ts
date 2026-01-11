import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateOrganizationsTable1768105009236
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure UUID extension exists
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // 2. Create organizations table
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'settings',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'parent_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true, // Skip if exists
    );

    // 3. Add check constraint for type column
    await queryRunner.query(`
      ALTER TABLE organizations
      ADD CONSTRAINT CHK_organizations_type
      CHECK (type IN ('company', 'department', 'team'))
    `);

    // 4. Create indexes
    // Index for slug (unique)
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_organizations_slug',
        columnNames: ['slug'],
        isUnique: true,
      }),
    );

    // Index for parent_id (regular)
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_organizations_parent_id',
        columnNames: ['parent_id'],
      }),
    );

    // Partial index for is_active (WHERE deleted_at IS NULL)
    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'IDX_organizations_is_active',
        columnNames: ['is_active'],
        where: 'deleted_at IS NULL',
      }),
    );

    // 5. Create self-referencing foreign key
    await queryRunner.createForeignKey(
      'organizations',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 6. Enable Row Level Security (RLS)
    await queryRunner.query(`
      ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
    `);

    // 7. Create helper function to check if user has a specific role (in public schema)
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

    // 8. Create helper function to check if user has a specific permission (in public schema)
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

    // 9. Create RLS Policies for SELECT
    await queryRunner.query(`
      -- Policy: Authenticated users can view active organizations
      CREATE POLICY organizations_select_policy ON organizations
        FOR SELECT
        USING (
          -- Allow if user is authenticated AND organization is active
          auth.uid() IS NOT NULL
          AND is_active = true
          AND deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      -- Policy: Admins can view all organizations
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

    // 10. Create RLS Policy for INSERT
    await queryRunner.query(`
      -- Policy: Only admins or users with 'organizations:create' permission can insert
      CREATE POLICY organizations_insert_policy ON organizations
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                public.user_has_role(u.id, 'admin')
                OR public.user_has_permission(u.id, 'organizations:create')
              )
          )
        );
    `);

    // 11. Create RLS Policy for UPDATE
    await queryRunner.query(`
      -- Policy: Only admins or users with 'organizations:update' permission can update
      CREATE POLICY organizations_update_policy ON organizations
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                public.user_has_role(u.id, 'admin')
                OR public.user_has_permission(u.id, 'organizations:update')
              )
          )
        );
    `);

    // 12. Create RLS Policy for DELETE
    await queryRunner.query(`
      -- Policy: Only admins or users with 'organizations:delete' permission can delete
      CREATE POLICY organizations_delete_policy ON organizations
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1
            FROM users u
            WHERE u.supabase_user_id = auth.uid()
              AND (
                public.user_has_role(u.id, 'admin')
                OR public.user_has_permission(u.id, 'organizations:delete')
              )
          )
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(
      `DROP POLICY IF EXISTS organizations_delete_policy ON organizations;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS organizations_update_policy ON organizations;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS organizations_insert_policy ON organizations;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS organizations_select_admin_policy ON organizations;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS organizations_select_policy ON organizations;`,
    );

    // Drop helper functions
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS public.user_has_permission(UUID, TEXT);`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS public.user_has_role(UUID, TEXT);`,
    );

    // Disable RLS
    await queryRunner.query(
      `ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;`,
    );

    // Drop table (automatically drops indexes, constraints, and foreign keys)
    await queryRunner.dropTable('organizations');
  }
}
