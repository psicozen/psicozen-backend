import { Role } from './role.enum';

describe('Role Enum', () => {
  it('should have SUPER_ADMIN role', () => {
    expect(Role.SUPER_ADMIN).toBe('super_admin');
  });

  it('should have ADMIN role', () => {
    expect(Role.ADMIN).toBe('admin');
  });

  it('should have MODERATOR role', () => {
    expect(Role.MODERATOR).toBe('moderator');
  });

  it('should have USER role', () => {
    expect(Role.USER).toBe('user');
  });

  it('should have exactly 4 roles', () => {
    const roles = Object.values(Role);
    expect(roles).toHaveLength(4);
  });

  it('should only contain string values', () => {
    const roles = Object.values(Role);
    roles.forEach((role) => {
      expect(typeof role).toBe('string');
    });
  });

  it('should have unique values', () => {
    const roles = Object.values(Role);
    const uniqueRoles = new Set(roles);
    expect(uniqueRoles.size).toBe(roles.length);
  });
});
