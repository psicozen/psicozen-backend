import {
  Role,
  ROLE_HIERARCHY,
  hasHigherRole,
  getSubordinateRoles,
  isGlobalRole,
} from './role.enum';

describe('Role Enum', () => {
  describe('Role values', () => {
    it('should have SUPER_ADMIN role', () => {
      expect(Role.SUPER_ADMIN).toBe('super_admin');
    });

    it('should have ADMIN role', () => {
      expect(Role.ADMIN).toBe('admin');
    });

    it('should have GESTOR role', () => {
      expect(Role.GESTOR).toBe('gestor');
    });

    it('should have COLABORADOR role', () => {
      expect(Role.COLABORADOR).toBe('colaborador');
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

  describe('ROLE_HIERARCHY', () => {
    it('should have hierarchy levels for all roles', () => {
      const roles = Object.values(Role);
      roles.forEach((role) => {
        expect(ROLE_HIERARCHY[role]).toBeDefined();
        expect(typeof ROLE_HIERARCHY[role]).toBe('number');
      });
    });

    it('should have SUPER_ADMIN as lowest hierarchy level (highest privilege)', () => {
      const minLevel = Math.min(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBe(minLevel);
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBe(0);
    });

    it('should have COLABORADOR as highest hierarchy level (lowest privilege)', () => {
      const maxLevel = Math.max(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY[Role.COLABORADOR]).toBe(maxLevel);
      expect(ROLE_HIERARCHY[Role.COLABORADOR]).toBe(300);
    });

    it('should have correct hierarchy order (lower number = higher privilege)', () => {
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBeLessThan(
        ROLE_HIERARCHY[Role.ADMIN],
      );
      expect(ROLE_HIERARCHY[Role.ADMIN]).toBeLessThan(
        ROLE_HIERARCHY[Role.GESTOR],
      );
      expect(ROLE_HIERARCHY[Role.GESTOR]).toBeLessThan(
        ROLE_HIERARCHY[Role.COLABORADOR],
      );
    });

    it('should have correct numeric values', () => {
      expect(ROLE_HIERARCHY[Role.SUPER_ADMIN]).toBe(0);
      expect(ROLE_HIERARCHY[Role.ADMIN]).toBe(100);
      expect(ROLE_HIERARCHY[Role.GESTOR]).toBe(200);
      expect(ROLE_HIERARCHY[Role.COLABORADOR]).toBe(300);
    });
  });

  describe('hasHigherRole', () => {
    it('should return true when user role has higher privilege (lower number)', () => {
      expect(hasHigherRole(Role.ADMIN, Role.COLABORADOR)).toBe(true); // 100 <= 300
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true); // 0 <= 100
      expect(hasHigherRole(Role.GESTOR, Role.COLABORADOR)).toBe(true); // 200 <= 300
    });

    it('should return true when roles are equal', () => {
      expect(hasHigherRole(Role.ADMIN, Role.ADMIN)).toBe(true);
      expect(hasHigherRole(Role.COLABORADOR, Role.COLABORADOR)).toBe(true);
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
      expect(hasHigherRole(Role.GESTOR, Role.GESTOR)).toBe(true);
    });

    it('should return false when user role has lower privilege (higher number)', () => {
      expect(hasHigherRole(Role.COLABORADOR, Role.ADMIN)).toBe(false); // 300 > 100
      expect(hasHigherRole(Role.COLABORADOR, Role.GESTOR)).toBe(false); // 300 > 200
      expect(hasHigherRole(Role.GESTOR, Role.ADMIN)).toBe(false); // 200 > 100
    });

    it('should work correctly for adjacent roles', () => {
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true); // 0 <= 100
      expect(hasHigherRole(Role.ADMIN, Role.SUPER_ADMIN)).toBe(false); // 100 > 0
      expect(hasHigherRole(Role.ADMIN, Role.GESTOR)).toBe(true); // 100 <= 200
      expect(hasHigherRole(Role.GESTOR, Role.ADMIN)).toBe(false); // 200 > 100
    });

    it('should correctly evaluate SUPER_ADMIN access to all roles', () => {
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.ADMIN)).toBe(true);
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.GESTOR)).toBe(true);
      expect(hasHigherRole(Role.SUPER_ADMIN, Role.COLABORADOR)).toBe(true);
    });

    it('should correctly deny COLABORADOR access to higher roles', () => {
      expect(hasHigherRole(Role.COLABORADOR, Role.SUPER_ADMIN)).toBe(false);
      expect(hasHigherRole(Role.COLABORADOR, Role.ADMIN)).toBe(false);
      expect(hasHigherRole(Role.COLABORADOR, Role.GESTOR)).toBe(false);
    });
  });

  describe('getSubordinateRoles', () => {
    it('should return all roles when given SUPER_ADMIN', () => {
      const subordinates = getSubordinateRoles(Role.SUPER_ADMIN);
      expect(subordinates).toHaveLength(4);
      expect(subordinates).toContain(Role.SUPER_ADMIN);
      expect(subordinates).toContain(Role.ADMIN);
      expect(subordinates).toContain(Role.GESTOR);
      expect(subordinates).toContain(Role.COLABORADOR);
    });

    it('should return only COLABORADOR when given COLABORADOR', () => {
      const subordinates = getSubordinateRoles(Role.COLABORADOR);
      expect(subordinates).toHaveLength(1);
      expect(subordinates).toContain(Role.COLABORADOR);
      expect(subordinates).not.toContain(Role.SUPER_ADMIN);
      expect(subordinates).not.toContain(Role.ADMIN);
      expect(subordinates).not.toContain(Role.GESTOR);
    });

    it('should return correct subordinate roles for ADMIN', () => {
      const subordinates = getSubordinateRoles(Role.ADMIN);
      expect(subordinates).toHaveLength(3);
      expect(subordinates).toContain(Role.ADMIN);
      expect(subordinates).toContain(Role.GESTOR);
      expect(subordinates).toContain(Role.COLABORADOR);
      expect(subordinates).not.toContain(Role.SUPER_ADMIN);
    });

    it('should return correct subordinate roles for GESTOR', () => {
      const subordinates = getSubordinateRoles(Role.GESTOR);
      expect(subordinates).toHaveLength(2);
      expect(subordinates).toContain(Role.GESTOR);
      expect(subordinates).toContain(Role.COLABORADOR);
      expect(subordinates).not.toContain(Role.SUPER_ADMIN);
      expect(subordinates).not.toContain(Role.ADMIN);
    });

    it('should include the given role itself', () => {
      const gestorSubordinates = getSubordinateRoles(Role.GESTOR);
      expect(gestorSubordinates).toContain(Role.GESTOR);

      const adminSubordinates = getSubordinateRoles(Role.ADMIN);
      expect(adminSubordinates).toContain(Role.ADMIN);
    });
  });

  describe('isGlobalRole', () => {
    it('should return true for SUPER_ADMIN', () => {
      expect(isGlobalRole(Role.SUPER_ADMIN)).toBe(true);
    });

    it('should return false for organization-scoped roles', () => {
      expect(isGlobalRole(Role.ADMIN)).toBe(false);
      expect(isGlobalRole(Role.GESTOR)).toBe(false);
      expect(isGlobalRole(Role.COLABORADOR)).toBe(false);
    });
  });
});
