/**
 * Role enum with hierarchy support for organization-scoped authorization.
 *
 * Hierarchy levels (higher = more permissions):
 * - SUPER_ADMIN (100): Global admin, bypasses organization checks
 * - OWNER (90): Organization owner, full control within org
 * - ADMIN (80): Organization admin
 * - MANAGER (60): Can manage resources and members
 * - THERAPIST (50): Healthcare professional role
 * - MEMBER (30): Regular organization member
 * - VIEWER (10): Read-only access
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  THERAPIST = 'therapist',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

/**
 * Role hierarchy levels - higher number means more permissions.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.OWNER]: 90,
  [Role.ADMIN]: 80,
  [Role.MANAGER]: 60,
  [Role.THERAPIST]: 50,
  [Role.MEMBER]: 30,
  [Role.VIEWER]: 10,
};

/**
 * Checks if a user role has equal or higher privileges than the required role.
 *
 * @param userRole - The role the user has
 * @param requiredRole - The minimum role required for access
 * @returns true if userRole >= requiredRole in hierarchy
 *
 * @example
 * hasHigherRole(Role.ADMIN, Role.MEMBER) // true - admin > member
 * hasHigherRole(Role.MEMBER, Role.ADMIN) // false - member < admin
 * hasHigherRole(Role.ADMIN, Role.ADMIN) // true - equal roles allowed
 */
export function hasHigherRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Gets all roles that have equal or higher privileges than the given role.
 *
 * @param role - The minimum role level
 * @returns Array of roles with equal or higher privileges
 */
export function getRolesAbove(role: Role): Role[] {
  const minLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level >= minLevel)
    .map(([roleName]) => roleName as Role);
}

/**
 * Checks if a role is a global role (not organization-scoped).
 * Currently only SUPER_ADMIN is a global role.
 */
export function isGlobalRole(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}
