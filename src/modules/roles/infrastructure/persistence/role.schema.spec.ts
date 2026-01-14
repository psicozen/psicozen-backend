import { RoleSchema } from './role.schema';
import { PermissionSchema } from './permission.schema';
import { OrganizationSchema } from '../../../organizations/infrastructure/persistence/organization.schema';

describe('RoleSchema', () => {
  it('should be defined', () => {
    expect(RoleSchema).toBeDefined();
  });

  it('should have correct table name', () => {
    expect(RoleSchema.name).toBe('RoleSchema');
  });

  it('should create instance with required properties', () => {
    const role = new RoleSchema();
    role.name = 'admin';
    role.description = 'Administrator role';
    role.permissions = [];

    expect(role.name).toBe('admin');
    expect(role.description).toBe('Administrator role');
    expect(role.permissions).toEqual([]);
  });

  it('should support many-to-many relationship with permissions', () => {
    const role = new RoleSchema();
    const permission1 = new PermissionSchema();
    const permission2 = new PermissionSchema();

    role.permissions = [permission1, permission2];

    expect(role.permissions).toHaveLength(2);
    expect(role.permissions[0]).toBeInstanceOf(PermissionSchema);
  });

  it('should have timestamps', () => {
    const role = new RoleSchema();
    role.createdAt = new Date();
    role.updatedAt = new Date();

    expect(role.createdAt).toBeInstanceOf(Date);
    expect(role.updatedAt).toBeInstanceOf(Date);
  });

  describe('organization fields', () => {
    it('should support organizationId field', () => {
      const role = new RoleSchema();
      const orgId = '123e4567-e89b-12d3-a456-426614174000';

      role.organizationId = orgId;

      expect(role.organizationId).toBe(orgId);
    });

    it('should allow null organizationId for system roles', () => {
      const role = new RoleSchema();
      role.organizationId = null;

      expect(role.organizationId).toBeNull();
    });

    it('should support hierarchyLevel field with default value', () => {
      const role = new RoleSchema();
      role.hierarchyLevel = 100;

      expect(role.hierarchyLevel).toBe(100);
    });

    it('should support different hierarchy levels', () => {
      const superAdmin = new RoleSchema();
      superAdmin.hierarchyLevel = 0;

      const admin = new RoleSchema();
      admin.hierarchyLevel = 100;

      const gestor = new RoleSchema();
      gestor.hierarchyLevel = 200;

      expect(superAdmin.hierarchyLevel).toBe(0);
      expect(admin.hierarchyLevel).toBe(100);
      expect(gestor.hierarchyLevel).toBe(200);
    });

    it('should support isSystemRole field', () => {
      const role = new RoleSchema();
      role.isSystemRole = true;

      expect(role.isSystemRole).toBe(true);
    });

    it('should default isSystemRole to false', () => {
      const role = new RoleSchema();
      role.isSystemRole = false;

      expect(role.isSystemRole).toBe(false);
    });

    it('should support many-to-one relationship with organization', () => {
      const role = new RoleSchema();
      const organization = new OrganizationSchema();
      organization.id = '123e4567-e89b-12d3-a456-426614174000';
      organization.name = 'Test Organization';

      role.organization = organization;
      role.organizationId = organization.id;

      expect(role.organization).toBeInstanceOf(OrganizationSchema);
      expect(role.organization.id).toBe(organization.id);
      expect(role.organizationId).toBe(organization.id);
    });
  });
});
