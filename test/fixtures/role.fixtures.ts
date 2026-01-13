import { RoleSchema } from '../../src/modules/roles/infrastructure/persistence/role.schema';
import { Role } from '../../src/modules/roles/domain/enums/role.enum';

let fixtureCounter = 0;

function generateTestId(): string {
  fixtureCounter++;
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const counter = fixtureCounter.toString(16).padStart(4, '0');
  const random = Math.random().toString(16).substring(2, 10);
  return `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-4000-8000-${counter}${random}`;
}

export interface CreateRoleFixtureOptions {
  id?: string;
  name?: string;
  description?: string;
}

/**
 * Creates a role fixture with default or custom values
 * @param options - Optional configuration for the role
 * @returns Partial RoleSchema object ready for database insertion
 */
export function createRoleFixture(
  options: CreateRoleFixtureOptions = {},
): Partial<RoleSchema> {
  const id = options.id ?? generateTestId();
  const name = options.name ?? `test_role_${fixtureCounter}`;
  const description =
    options.description ?? `Test role ${fixtureCounter} description`;

  return {
    id,
    name,
    description,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates all default roles used in the PsicoZen system
 * @returns Object containing all 4 system roles with correct names and descriptions
 */
export function createDefaultRoles(): {
  superAdmin: Partial<RoleSchema>;
  admin: Partial<RoleSchema>;
  gestor: Partial<RoleSchema>;
  colaborador: Partial<RoleSchema>;
} {
  const superAdmin = createRoleFixture({
    name: Role.SUPER_ADMIN,
    description:
      'Super administrador da plataforma com acesso total ao sistema',
  });

  const admin = createRoleFixture({
    name: Role.ADMIN,
    description: 'Administrador da organização com acesso completo',
  });

  const gestor = createRoleFixture({
    name: Role.GESTOR,
    description: 'Gerente/supervisor de equipe com acesso gerencial',
  });

  const colaborador = createRoleFixture({
    name: Role.COLABORADOR,
    description: 'Funcionário padrão com acesso básico',
  });

  return { superAdmin, admin, gestor, colaborador };
}

/**
 * Creates specific role by name from Role enum
 * @param roleName - Role enum value
 * @returns Partial RoleSchema object for the specified role
 */
export function createRoleByName(roleName: Role): Partial<RoleSchema> {
  const descriptions: Record<Role, string> = {
    [Role.SUPER_ADMIN]:
      'Super administrador da plataforma com acesso total ao sistema',
    [Role.ADMIN]: 'Administrador da organização com acesso completo',
    [Role.GESTOR]: 'Gerente/supervisor de equipe com acesso gerencial',
    [Role.COLABORADOR]: 'Funcionário padrão com acesso básico',
  };

  return createRoleFixture({
    name: roleName,
    description: descriptions[roleName],
  });
}

/**
 * Resets the fixture counter (useful between test suites)
 */
export function resetRoleFixtureCounter(): void {
  fixtureCounter = 0;
}
