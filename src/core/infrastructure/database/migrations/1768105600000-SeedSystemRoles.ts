import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed System Roles and Permissions
 *
 * Purpose: Create the default system roles required for RBAC
 *
 * Roles created:
 * - super_admin (global, highest privileges)
 * - admin (organization-level administrator)
 * - gestor (organization manager)
 * - colaborador (organization collaborator)
 *
 * These roles are marked as is_system_role = true and cannot be deleted.
 */
export class SeedSystemRoles1768105600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Insert system roles
    await queryRunner.query(`
      INSERT INTO roles (name, description, is_system_role, created_at, updated_at)
      VALUES
        ('super_admin', 'Super Administrator with global access', true, now(), now()),
        ('admin', 'Organization Administrator', true, now(), now()),
        ('gestor', 'Organization Manager', true, now(), now()),
        ('colaborador', 'Organization Collaborator', true, now(), now())
      ON CONFLICT (name) DO NOTHING;
    `);

    // 2. Insert basic permissions for organizations
    await queryRunner.query(`
      INSERT INTO permissions (name, description, resource, action, created_at, updated_at)
      VALUES
        ('organizations:create', 'Create new organizations', 'organizations', 'create', now(), now()),
        ('organizations:read', 'View organizations', 'organizations', 'read', now(), now()),
        ('organizations:update', 'Update organizations', 'organizations', 'update', now(), now()),
        ('organizations:delete', 'Delete organizations', 'organizations', 'delete', now(), now()),
        ('users:create', 'Create new users', 'users', 'create', now(), now()),
        ('users:read', 'View users', 'users', 'read', now(), now()),
        ('users:update', 'Update users', 'users', 'update', now(), now()),
        ('users:delete', 'Delete users', 'users', 'delete', now(), now())
      ON CONFLICT (name) DO NOTHING;
    `);

    // 3. Assign permissions to roles
    // super_admin gets all permissions (implicitly via RLS policy)
    // admin gets organization management permissions
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'admin'
        AND p.resource = 'organizations'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        );
    `);

    // gestor gets read and update on organizations
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'gestor'
        AND p.resource = 'organizations'
        AND p.action IN ('read', 'update')
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        );
    `);

    // colaborador gets only read on organizations
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.name = 'colaborador'
        AND p.resource = 'organizations'
        AND p.action = 'read'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        );
    `);

    console.log('✅ Seed system roles and permissions created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete role_permissions
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (
        SELECT id FROM roles WHERE is_system_role = true
      );
    `);

    // Delete permissions
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE resource IN ('organizations', 'users');
    `);

    // Delete system roles
    await queryRunner.query(`
      DELETE FROM roles
      WHERE name IN ('super_admin', 'admin', 'gestor', 'colaborador');
    `);

    console.log('✅ Seed system roles and permissions removed successfully');
  }
}
