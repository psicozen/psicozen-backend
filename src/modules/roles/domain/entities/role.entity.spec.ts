import { RoleEntity } from './role.entity';

describe('RoleEntity', () => {
  describe('create with string parameters (legacy)', () => {
    it('should create a role with name and description', () => {
      const name = 'admin';
      const description = 'Administrator role';

      const role = RoleEntity.create(name, description);

      expect(role.name).toBe(name);
      expect(role.description).toBe(description);
      expect(role.createdAt).toBeInstanceOf(Date);
      expect(role.updatedAt).toBeInstanceOf(Date);
    });

    it('should set default values for organization fields', () => {
      const role = RoleEntity.create('admin', 'Admin role');

      expect(role.organizationId).toBeNull();
      expect(role.hierarchyLevel).toBe(100);
      expect(role.isSystemRole).toBe(false);
    });

    it('should create role with all standard roles', () => {
      const roles = ['admin', 'moderator', 'user'];

      roles.forEach((roleName) => {
        const role = RoleEntity.create(roleName, `${roleName} role`);
        expect(role.name).toBe(roleName);
      });
    });
  });

  describe('create with params object', () => {
    it('should create a role with all parameters', () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174000';
      const role = RoleEntity.create({
        name: 'org-admin',
        description: 'Organization admin',
        organizationId: orgId,
        hierarchyLevel: 100,
        isSystemRole: false,
      });

      expect(role.name).toBe('org-admin');
      expect(role.description).toBe('Organization admin');
      expect(role.organizationId).toBe(orgId);
      expect(role.hierarchyLevel).toBe(100);
      expect(role.isSystemRole).toBe(false);
    });

    it('should create a system role with no organization', () => {
      const role = RoleEntity.create({
        name: 'super_admin',
        description: 'Super Admin',
        hierarchyLevel: 0,
        isSystemRole: true,
      });

      expect(role.name).toBe('super_admin');
      expect(role.organizationId).toBeNull();
      expect(role.hierarchyLevel).toBe(0);
      expect(role.isSystemRole).toBe(true);
    });

    it('should use default values when optional params not provided', () => {
      const role = RoleEntity.create({
        name: 'basic-role',
        description: 'Basic role',
      });

      expect(role.organizationId).toBeNull();
      expect(role.hierarchyLevel).toBe(100);
      expect(role.isSystemRole).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create role from partial data', () => {
      const partial = {
        name: 'custom-role',
        description: 'Custom description',
        id: 'role-123',
      };

      const role = new RoleEntity(partial);

      expect(role.name).toBe(partial.name);
      expect(role.description).toBe(partial.description);
      expect(role.id).toBe(partial.id);
    });

    it('should set default values for organization fields in constructor', () => {
      const role = new RoleEntity();

      expect(role.organizationId).toBeNull();
      expect(role.hierarchyLevel).toBe(100);
      expect(role.isSystemRole).toBe(false);
    });

    it('should allow overriding default values via partial', () => {
      const role = new RoleEntity({
        organizationId: 'org-123',
        hierarchyLevel: 50,
        isSystemRole: true,
      });

      expect(role.organizationId).toBe('org-123');
      expect(role.hierarchyLevel).toBe(50);
      expect(role.isSystemRole).toBe(true);
    });
  });

  describe('belongsToOrganization', () => {
    it('should return true when organizationId matches', () => {
      const orgId = '123e4567-e89b-12d3-a456-426614174000';
      const role = RoleEntity.create({
        name: 'org-role',
        description: 'Org role',
        organizationId: orgId,
      });

      expect(role.belongsToOrganization(orgId)).toBe(true);
    });

    it('should return false when organizationId does not match', () => {
      const role = RoleEntity.create({
        name: 'org-role',
        description: 'Org role',
        organizationId: 'org-1',
      });

      expect(role.belongsToOrganization('org-2')).toBe(false);
    });

    it('should return false for system roles with null organizationId', () => {
      const role = RoleEntity.create({
        name: 'super_admin',
        description: 'Super admin',
        isSystemRole: true,
      });

      expect(role.belongsToOrganization('any-org')).toBe(false);
    });
  });

  describe('hasHigherPrivilegeThan', () => {
    it('should return true when hierarchy level is lower (higher privilege)', () => {
      const superAdmin = RoleEntity.create({
        name: 'super_admin',
        description: 'Super admin',
        hierarchyLevel: 0,
        isSystemRole: true,
      });

      const admin = RoleEntity.create({
        name: 'admin',
        description: 'Admin',
        hierarchyLevel: 100,
      });

      expect(superAdmin.hasHigherPrivilegeThan(admin)).toBe(true);
    });

    it('should return false when hierarchy level is higher (lower privilege)', () => {
      const colaborador = RoleEntity.create({
        name: 'colaborador',
        description: 'Colaborador',
        hierarchyLevel: 300,
      });

      const gestor = RoleEntity.create({
        name: 'gestor',
        description: 'Gestor',
        hierarchyLevel: 200,
      });

      expect(colaborador.hasHigherPrivilegeThan(gestor)).toBe(false);
    });

    it('should return false when hierarchy levels are equal', () => {
      const admin1 = RoleEntity.create({
        name: 'admin1',
        description: 'Admin 1',
        hierarchyLevel: 100,
      });

      const admin2 = RoleEntity.create({
        name: 'admin2',
        description: 'Admin 2',
        hierarchyLevel: 100,
      });

      expect(admin1.hasHigherPrivilegeThan(admin2)).toBe(false);
    });
  });

  describe('isGlobal', () => {
    it('should return true for system role with null organizationId', () => {
      const role = RoleEntity.create({
        name: 'super_admin',
        description: 'Super admin',
        isSystemRole: true,
        organizationId: null,
      });

      expect(role.isGlobal()).toBe(true);
    });

    it('should return false for non-system role', () => {
      const role = RoleEntity.create({
        name: 'org-admin',
        description: 'Org admin',
        isSystemRole: false,
        organizationId: null,
      });

      expect(role.isGlobal()).toBe(false);
    });

    it('should return false for system role with organizationId', () => {
      const role = RoleEntity.create({
        name: 'org-system-role',
        description: 'Org system role',
        isSystemRole: true,
        organizationId: 'org-123',
      });

      expect(role.isGlobal()).toBe(false);
    });
  });
});
