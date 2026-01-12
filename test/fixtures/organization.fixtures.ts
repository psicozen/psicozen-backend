import { TestOrganizationSchema } from '../config/test-organization.schema';
import {
  OrganizationType,
  DEFAULT_ORGANIZATION_SETTINGS,
} from '../../src/modules/organizations/domain/types/organization-settings.types';

let fixtureCounter = 0;

function generateTestId(): string {
  fixtureCounter++;
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const counter = fixtureCounter.toString(16).padStart(4, '0');
  const random = Math.random().toString(16).substring(2, 10);
  return `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-4000-8000-${counter}${random}`;
}

export interface CreateOrganizationFixtureOptions {
  id?: string;
  name?: string;
  slug?: string;
  type?: OrganizationType;
  parentId?: string;
  isActive?: boolean;
  deletedAt?: Date;
}

export function createOrganizationFixture(
  options: CreateOrganizationFixtureOptions = {},
): Partial<TestOrganizationSchema> {
  const id = options.id ?? generateTestId();
  const name = options.name ?? `Test Organization ${fixtureCounter}`;
  const slug = options.slug ?? name.toLowerCase().replace(/\s+/g, '-');

  return {
    id,
    name,
    slug,
    type: options.type ?? 'company',
    settings: DEFAULT_ORGANIZATION_SETTINGS,
    parentId: options.parentId,
    isActive: options.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: options.deletedAt,
  };
}

export function createCompanyFixture(
  options: Omit<CreateOrganizationFixtureOptions, 'type'> = {},
): Partial<TestOrganizationSchema> {
  return createOrganizationFixture({ ...options, type: 'company' });
}

export function createDepartmentFixture(
  options: Omit<CreateOrganizationFixtureOptions, 'type'> = {},
): Partial<TestOrganizationSchema> {
  return createOrganizationFixture({ ...options, type: 'department' });
}

export function createTeamFixture(
  options: Omit<CreateOrganizationFixtureOptions, 'type'> = {},
): Partial<TestOrganizationSchema> {
  return createOrganizationFixture({ ...options, type: 'team' });
}

export function createOrganizationHierarchy(): {
  company: Partial<TestOrganizationSchema>;
  department1: Partial<TestOrganizationSchema>;
  department2: Partial<TestOrganizationSchema>;
  team1: Partial<TestOrganizationSchema>;
  team2: Partial<TestOrganizationSchema>;
} {
  const company = createCompanyFixture({ name: 'Acme Corp', slug: 'acme-corp' });
  const department1 = createDepartmentFixture({
    name: 'Engineering',
    slug: 'engineering',
    parentId: company.id,
  });
  const department2 = createDepartmentFixture({
    name: 'Marketing',
    slug: 'marketing',
    parentId: company.id,
  });
  const team1 = createTeamFixture({
    name: 'Backend Team',
    slug: 'backend-team',
    parentId: department1.id,
  });
  const team2 = createTeamFixture({
    name: 'Frontend Team',
    slug: 'frontend-team',
    parentId: department1.id,
  });

  return { company, department1, department2, team1, team2 };
}

export function resetFixtureCounter(): void {
  fixtureCounter = 0;
}
