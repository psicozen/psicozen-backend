/**
 * Sistema de papéis hierárquico para PsicoZen
 * Menor hierarchy_level = maiores privilégios
 */
export enum Role {
  /** Super administrador da plataforma (nível 0) */
  SUPER_ADMIN = 'super_admin',

  /** Administrador da organização (nível 100) */
  ADMIN = 'admin',

  /** Gerente/supervisor de equipe (nível 200) */
  GESTOR = 'gestor',

  /** Funcionário padrão (nível 300) */
  COLABORADOR = 'colaborador',
}

/**
 * Níveis de hierarquia numéricos para papéis
 * Número menor = maior privilégio
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 0,
  [Role.ADMIN]: 100,
  [Role.GESTOR]: 200,
  [Role.COLABORADOR]: 300,
};

/**
 * Verifica se o papel do usuário tem privilégios suficientes
 * @param userRole - Papel atribuído ao usuário
 * @param requiredRole - Papel mínimo requerido
 * @returns true se o papel do usuário tem privilégios iguais ou superiores
 * @example
 * hasHigherRole(Role.ADMIN, Role.GESTOR) // true (Admin pode fazer o que Gestor faz)
 * hasHigherRole(Role.COLABORADOR, Role.ADMIN) // false (Colaborador não pode fazer tarefas de Admin)
 */
export function hasHigherRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[requiredRole];
}

/**
 * Obtém todos os papéis com privilégio igual ou menor que o papel fornecido
 * @example
 * getSubordinateRoles(Role.GESTOR) // [Role.GESTOR, Role.COLABORADOR]
 */
export function getSubordinateRoles(role: Role): Role[] {
  const level = ROLE_HIERARCHY[role];
  return Object.values(Role).filter((r) => ROLE_HIERARCHY[r] >= level);
}

/**
 * Checks if a role is a global role (not organization-scoped).
 * Currently only SUPER_ADMIN is a global role.
 */
export function isGlobalRole(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}
