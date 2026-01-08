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
});
