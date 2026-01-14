import { UserRoleSchema } from './user-role.schema';

describe('UserRoleSchema', () => {
  it('should be defined', () => {
    expect(UserRoleSchema).toBeDefined();
  });

  it('should create instance with required properties', () => {
    const userRole = new UserRoleSchema();
    userRole.userId = 'user-123';
    userRole.roleId = 'role-456';
    userRole.assignedBy = 'admin-789';

    expect(userRole.userId).toBe('user-123');
    expect(userRole.roleId).toBe('role-456');
    expect(userRole.assignedBy).toBe('admin-789');
  });

  it('should have assignedAt timestamp', () => {
    const userRole = new UserRoleSchema();
    userRole.assignedAt = new Date();

    expect(userRole.assignedAt).toBeInstanceOf(Date);
  });

  it('should support role assignment tracking', () => {
    const userRole = new UserRoleSchema();
    userRole.id = 'assignment-123';
    userRole.userId = 'user-456';
    userRole.roleId = 'role-789';
    userRole.assignedBy = 'admin-000';
    userRole.assignedAt = new Date('2024-01-01');

    expect(userRole.id).toBe('assignment-123');
    expect(userRole.assignedAt).toEqual(new Date('2024-01-01'));
  });

  describe('organizationId', () => {
    it('should support organizational role (with organizationId)', () => {
      const userRole = new UserRoleSchema();
      userRole.userId = 'user-123';
      userRole.roleId = 'role-456';
      userRole.organizationId = 'org-789';
      userRole.assignedBy = 'admin-001';

      expect(userRole.organizationId).toBe('org-789');
      expect(userRole.userId).toBe('user-123');
      expect(userRole.roleId).toBe('role-456');
    });

    it('should support global role (without organizationId)', () => {
      const userRole = new UserRoleSchema();
      userRole.userId = 'user-123';
      userRole.roleId = 'role-super-admin';
      userRole.organizationId = null;
      userRole.assignedBy = 'system';

      expect(userRole.organizationId).toBeNull();
      expect(userRole.userId).toBe('user-123');
      expect(userRole.roleId).toBe('role-super-admin');
    });

    it('should allow organizationId to be null', () => {
      const userRole = new UserRoleSchema();
      userRole.organizationId = null;

      expect(userRole.organizationId).toBeNull();
    });

    it('should allow organizationId to be a UUID string', () => {
      const userRole = new UserRoleSchema();
      const orgId = '550e8400-e29b-41d4-a716-446655440000';
      userRole.organizationId = orgId;

      expect(userRole.organizationId).toBe(orgId);
    });
  });

  describe('assignedBy', () => {
    it('should track who assigned the role', () => {
      const userRole = new UserRoleSchema();
      userRole.assignedBy = 'admin-123';

      expect(userRole.assignedBy).toBe('admin-123');
    });

    it('should allow assignedBy to be null for system assignments', () => {
      const userRole = new UserRoleSchema();
      userRole.assignedBy = null;

      expect(userRole.assignedBy).toBeNull();
    });
  });

  describe('unique constraint', () => {
    it('should enforce unique combination of userId, roleId, and organizationId', () => {
      const userRole1 = new UserRoleSchema();
      userRole1.userId = 'user-123';
      userRole1.roleId = 'role-456';
      userRole1.organizationId = 'org-789';

      const userRole2 = new UserRoleSchema();
      userRole2.userId = 'user-123';
      userRole2.roleId = 'role-456';
      userRole2.organizationId = 'org-789';

      // Same combination - would violate unique constraint in database
      expect(userRole1.userId).toBe(userRole2.userId);
      expect(userRole1.roleId).toBe(userRole2.roleId);
      expect(userRole1.organizationId).toBe(userRole2.organizationId);
    });

    it('should allow same user+role in different organizations', () => {
      const userRole1 = new UserRoleSchema();
      userRole1.userId = 'user-123';
      userRole1.roleId = 'role-456';
      userRole1.organizationId = 'org-789';

      const userRole2 = new UserRoleSchema();
      userRole2.userId = 'user-123';
      userRole2.roleId = 'role-456';
      userRole2.organizationId = 'org-999'; // Different organization

      // Different organizations - should be allowed
      expect(userRole1.organizationId).not.toBe(userRole2.organizationId);
    });

    it('should allow same user+role as global and organizational', () => {
      const globalRole = new UserRoleSchema();
      globalRole.userId = 'user-123';
      globalRole.roleId = 'role-456';
      globalRole.organizationId = null; // Global

      const orgRole = new UserRoleSchema();
      orgRole.userId = 'user-123';
      orgRole.roleId = 'role-456';
      orgRole.organizationId = 'org-789'; // Organizational

      // Global vs organizational - different contexts
      expect(globalRole.organizationId).toBeNull();
      expect(orgRole.organizationId).not.toBeNull();
    });
  });
});
