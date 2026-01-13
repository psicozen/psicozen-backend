import {
  Role,
  ROLE_HIERARCHY,
  hasHigherRole,
  getRolesAbove,
  isGlobalRole,
} from './role.enum';

describe('Role Enum', () => {
  describe('Role values', () => {
    it('should have SUPER_ADMIN role', () => {
      expect(Role.SUPER_ADMIN).toBe('super_admin');
    });

    it('should have OWNER role', () => {
      expect(Role.OWNER).toBe('owner');
    });

    it('should have ADMIN role', () => {
      expect(Role.ADMIN).toBe('admin');
    });

    it('should have MANAGER role', () => {
      expect(Role.MANAGER).toBe('manager');
    });

    it('should have THERAPIST role', () => {
      expect(Role.THERAPIST).toBe('therapist');
    });

    it('should have MEMBER role', () => {
      expect(Role.MEMBER).toBe('member');
    });

    it('should have VIEWER role', () => {
      expect(Role.VIEWER).toBe('viewer');
    });

    it('should have exactly 7 roles', () => {
      const roles = Object.values(Role);
      expect(roles).toHaveLength(7);
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

  describe('ROLE_HIERARCHY', () => {
    it('should have hierarchy levels for all roles', () => {
      const roles = Object.values(Role);
      roles.forEach((role) => {
        expect(ROLE_HIERARCHY[role]).toBeDefined();
        expect(typeof ROLE_HIERARCHY[role]).toBe('number');
      });
    });

    it('should have SUPER_ADMIN as highest level', () => {
      const maxLevel = Math.max(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBe(maxLevel);
    });

    it('should have VIEWER as lowest level', () => {
      const minLevel = Math.min(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY[Role.VIEWER]).toBe(minLevel);
    });

    it('should have correct hierarchy order', () => {
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.OWNER],
      );
      expect(ROLE_HIERARCHY[Role.OWNER]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.ADMIN],
      );
      expect(ROLE_HIERARCHY[Role.ADMIN]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.MANAGER],
      );
      expect(ROLE_HIERARCHY[Role.MANAGER]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.THERAPIST],
      );
      expect(ROLE_HIERARCHY[Role.THERAPIST]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.MEMBER],
      );
      expect(ROLE_HIERARCHY[Role.MEMBER]).toBeGreaterThan(
        ROLE_HIERARCHY[Role.VIEWER],
      );
    });
  });

  describe('hasHigherRole', () => {
    it('should return true when user role is higher than required', () => {
      expect(hasHigherRole(Role.ADMIN, Role.MEMBER)).toBe(true);
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
      expect(hasHigherRole(Role.OWNER, Role.THERAPIST)).toBe(true);
    });

    it('should return true when roles are equal', () => {
      expect(hasHigherRole(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(hasHigherRole(Role.MEMBER, Role.MEMBER)).toBe(true);
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false when user role is lower than required', () => {
      expect(hasHigherRole(Role.MEMBER, Role.ADMIN)).toBe(false);
      expect(hasHigherRole(Role.VIEWER, Role.MEMBER)).toBe(false);
      expect(hasHigherRole(Role.THERAPIST, Role.OWNER)).toBe(false);
    });

    it('should work correctly for adjacent roles', () => {
      expect(hasHigherRole(Role.OWNER, Role.ADMIN)).toBe(true);
      expect(hasHigherRole(Role.ADMIN, Role.OWNER)).toBe(false);
    });
  });

  describe('getRolesAbove', () => {
    it('should return all roles when given VIEWER', () => {
      const roles = getRolesAbove(Role.VIEWER);
      expect(roles).toHaveLength(7);
      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).toContain(Role.VIEWER);
    });

    it('should return only SUPER_ADMIN when given SUPER_ADMIN', () => {
      const roles = getRolesAbove(Role.SUPER_ADMIN);
      expect(roles).toHaveLength(1);
      expect(roles).toContain(Role.SUPER_ADMIN);
    });

    it('should return correct roles for ADMIN', () => {
      const roles = getRolesAbove(Role.ADMIN);
      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).toContain(Role.OWNER);
      expect(roles).toContain(Role.ADMIN);
      expect(roles).not.toContain(Role.MANAGER);
      expect(roles).not.toContain(Role.MEMBER);
    });

    it('should include the given role itself', () => {
      const roles = getRolesAbove(Role.THERAPIST);
      expect(roles).toContain(Role.THERAPIST);
    });
  });

  describe('isGlobalRole', () => {
    it('should return true for SUPER_ADMIN', () => {
      expect(isGlobalRole(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false for organization-scoped roles', () => {
      expect(isGlobalRole(Role.OWNER)).toBe(false);
      expect(isGlobalRole(Role.ADMIN)).toBe(false);
      expect(isGlobalRole(Role.MANAGER)).toBe(false);
      expect(isGlobalRole(Role.THERAPIST)).toBe(false);
      expect(isGlobalRole(Role.MEMBER)).toBe(false);
      expect(isGlobalRole(Role.VIEWER)).toBe(false);
    });
  });
});
