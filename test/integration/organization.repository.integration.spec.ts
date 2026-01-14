import { Repository } from 'typeorm';
import { OrganizationRepository } from '../../src/modules/organizations/infrastructure/repositories/organization.repository';
import { OrganizationSchema } from '../../src/modules/organizations/infrastructure/persistence/organization.schema';
import { OrganizationEntity } from '../../src/modules/organizations/domain/entities/organization.entity';
import {
  initializeTestDatabase,
  clearDatabase,
  closeDatabase,
  getTestDataSource,
  runAsServiceRole,
} from '../utils/test-database.helper';
import { getTransactionManager } from '../../src/core/infrastructure/database/rls.storage';
import { resetAllFixtures } from '../utils/reset-fixtures.helper';
import {
  createCompanyFixture,
  createDepartmentFixture,
  createTeamFixture,
  createOrganizationHierarchy,
} from '../fixtures/organization.fixtures';

describe('OrganizationRepository Integration Tests', () => {
  let repository: OrganizationRepository;
  let typeormRepository: Repository<OrganizationSchema>;

  beforeAll(async () => {
    await initializeTestDatabase();
    const dataSource = getTestDataSource();
    typeormRepository = dataSource.getRepository(OrganizationSchema);
    repository = new OrganizationRepository(typeormRepository);
  });

  afterEach(async () => {
    // Reset fixture counters to prevent conflicts across multiple test runs
    resetAllFixtures();
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('create', () => {
    it('should create organization in database', async () => {
      const orgData = OrganizationEntity.create({
        name: 'Test Company',
        type: 'company',
      });

      const result = await repository.create(orgData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Company');
      expect(result.type).toBe('company');
      expect(result.slug).toBe('test-company');
      expect(result.isActive).toBe(true);
    });

    it('should generate UUID on create', async () => {
      const orgData = OrganizationEntity.create({
        name: 'UUID Test Org',
        type: 'company',
      });

      const result = await repository.create(orgData);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBe(36);
    });

    it('should set timestamps on create', async () => {
      const orgData = OrganizationEntity.create({
        name: 'Timestamp Test Org',
        type: 'company',
      });

      const result = await repository.create(orgData);

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should persist organization to database', async () => {
      const orgData = OrganizationEntity.create({
        name: 'Persistent Org',
        type: 'company',
      });

      const created = await repository.create(orgData);
      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Persistent Org');
    });
  });

  describe('findBySlug', () => {
    it('should find organization by slug', async () => {
      const fixture = createCompanyFixture({
        name: 'Slug Test Company',
        slug: 'slug-test-company',
      });
      await typeormRepository.save(fixture);

      const result = await repository.findBySlug('slug-test-company');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('slug-test-company');
      expect(result?.name).toBe('Slug Test Company');
    });

    it('should return null for non-existent slug', async () => {
      const result = await repository.findBySlug('non-existent-slug');

      expect(result).toBeNull();
    });

    it('should exclude soft-deleted organizations', async () => {
      const fixture = createCompanyFixture({
        name: 'Deleted Company',
        slug: 'deleted-company',
        deletedAt: new Date(),
      });
      await typeormRepository.save(fixture);

      const result = await repository.findBySlug('deleted-company');

      expect(result).toBeNull();
    });

    it('should find organization with special characters in slug', async () => {
      const fixture = createCompanyFixture({
        name: 'Test & Company',
        slug: 'test-company-123',
      });
      await typeormRepository.save(fixture);

      const result = await repository.findBySlug('test-company-123');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('test-company-123');
    });
  });

  describe('findChildren', () => {
    it('should find child organizations by parentId', async () => {
      const hierarchy = createOrganizationHierarchy();
      await typeormRepository.save(hierarchy.company);
      await typeormRepository.save(hierarchy.department1);
      await typeormRepository.save(hierarchy.department2);

      const children = await repository.findChildren(hierarchy.company.id);

      expect(children).toHaveLength(2);
      expect(children.map((c) => c.name)).toContain('Engineering');
      expect(children.map((c) => c.name)).toContain('Marketing');
    });

    it('should return empty array when no children exist', async () => {
      const fixture = createCompanyFixture({ name: 'Lonely Company' });
      await typeormRepository.save(fixture);

      const children = await repository.findChildren(fixture.id);

      expect(children).toEqual([]);
    });

    it('should order children by createdAt ASC', async () => {
      await runAsServiceRole(async () => {
        // Create parent using repository (uses transaction context)
        const parentData = OrganizationEntity.create({
          name: 'Parent Company',
          type: 'company',
        });
        const parent = await repository.create(parentData);

        // Create children with explicit createdAt timestamps
        const child1Data = OrganizationEntity.create({
          name: 'First Department',
          type: 'department',
          parentId: parent.id,
        });
        const child1 = await repository.create(child1Data);
        // Update createdAt after creation
        await typeormRepository.update(child1.id, {
          createdAt: new Date('2024-01-01'),
        });

        const child2Data = OrganizationEntity.create({
          name: 'Second Department',
          type: 'department',
          parentId: parent.id,
        });
        const child2 = await repository.create(child2Data);
        await typeormRepository.update(child2.id, {
          createdAt: new Date('2024-01-02'),
        });

        const child3Data = OrganizationEntity.create({
          name: 'Third Department',
          type: 'department',
          parentId: parent.id,
        });
        const child3 = await repository.create(child3Data);
        await typeormRepository.update(child3.id, {
          createdAt: new Date('2024-01-03'),
        });

        const children = await repository.findChildren(parent.id);

        expect(children).toHaveLength(3);
        expect(children[0].name).toBe('First Department');
        expect(children[1].name).toBe('Second Department');
        expect(children[2].name).toBe('Third Department');
      });
    });

    it('should exclude soft-deleted children', async () => {
      const parent = createCompanyFixture({ name: 'Parent with Deleted' });
      await typeormRepository.save(parent);

      const activeChild = createDepartmentFixture({
        name: 'Active Department',
        parentId: parent.id,
      });
      await typeormRepository.save(activeChild);

      const deletedChild = createDepartmentFixture({
        name: 'Deleted Department',
        parentId: parent.id,
        deletedAt: new Date(),
      });
      await typeormRepository.save(deletedChild);

      const children = await repository.findChildren(parent.id);

      expect(children).toHaveLength(1);
      expect(children[0].name).toBe('Active Department');
    });

    it('should return empty array for non-existent parent', async () => {
      const children = await repository.findChildren(
        '00000000-0000-0000-0000-000000000000',
      );

      expect(children).toEqual([]);
    });
  });

  describe('findActiveByType', () => {
    it('should find active organizations by type', async () => {
      const company1 = createCompanyFixture({ name: 'Company A' });
      const company2 = createCompanyFixture({ name: 'Company B' });
      const department = createDepartmentFixture({ name: 'Department A' });
      await typeormRepository.save([company1, company2, department]);

      const companies = await repository.findActiveByType('company');

      expect(companies).toHaveLength(2);
      expect(companies.every((c) => c.type === 'company')).toBe(true);
    });

    it('should filter inactive organizations', async () => {
      // CRITICAL: Create fixtures within runAsServiceRole to ensure proper RLS context
      await runAsServiceRole(async () => {
        const activeCompany = createCompanyFixture({
          name: 'Active Company',
          isActive: true,
        });
        const inactiveCompany = createCompanyFixture({
          name: 'Inactive Company',
          isActive: false,
        });
        await typeormRepository.save([activeCompany, inactiveCompany]);
      });

      const result = await repository.findActiveByType('company');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Company');
    });

    it('should order by name ASC', async () => {
      await runAsServiceRole(async () => {
        // Create companies using repository (uses transaction context)
        await repository.create(
          OrganizationEntity.create({ name: 'Charlie Corp', type: 'company' }),
        );
        await repository.create(
          OrganizationEntity.create({ name: 'Alpha Inc', type: 'company' }),
        );
        await repository.create(
          OrganizationEntity.create({ name: 'Beta Ltd', type: 'company' }),
        );

        const result = await repository.findActiveByType('company');

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('Alpha Inc');
        expect(result[1].name).toBe('Beta Ltd');
        expect(result[2].name).toBe('Charlie Corp');
      });
    });

    it('should exclude soft-deleted organizations', async () => {
      const activeCompany = createCompanyFixture({ name: 'Active Company' });
      const deletedCompany = createCompanyFixture({
        name: 'Deleted Company',
        deletedAt: new Date(),
      });
      await typeormRepository.save([activeCompany, deletedCompany]);

      const result = await repository.findActiveByType('company');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Company');
    });

    it('should return empty array when no active organizations of type exist', async () => {
      const department = createDepartmentFixture({ name: 'Only Department' });
      await typeormRepository.save(department);

      const result = await repository.findActiveByType('team');

      expect(result).toEqual([]);
    });

    it('should find departments correctly', async () => {
      const department1 = createDepartmentFixture({ name: 'HR' });
      const department2 = createDepartmentFixture({ name: 'Finance' });
      const team = createTeamFixture({ name: 'Dev Team' });
      await typeormRepository.save([department1, department2, team]);

      const result = await repository.findActiveByType('department');

      expect(result).toHaveLength(2);
      expect(result.every((d) => d.type === 'department')).toBe(true);
    });

    it('should find teams correctly', async () => {
      const team1 = createTeamFixture({ name: 'Backend Team' });
      const team2 = createTeamFixture({ name: 'Frontend Team' });
      const company = createCompanyFixture({ name: 'Some Company' });
      await typeormRepository.save([team1, team2, company]);

      const result = await repository.findActiveByType('team');

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.type === 'team')).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find organization by id', async () => {
      const fixture = createCompanyFixture({ name: 'Find By ID Test' });
      await typeormRepository.save(fixture);

      const result = await repository.findById(fixture.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(fixture.id);
      expect(result?.name).toBe('Find By ID Test');
    });

    it('should return null for non-existent id', async () => {
      const result = await repository.findById(
        '00000000-0000-0000-0000-000000000000',
      );

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update organization', async () => {
      await runAsServiceRole(async () => {
        // Create using repository (uses transaction context)
        const orgData = OrganizationEntity.create({
          name: 'Original Name',
          type: 'company',
        });
        const created = await repository.create(orgData);

        const updated = await repository.update(created.id, {
          name: 'New Name',
        });

        expect(updated.name).toBe('New Name');
      });
    });

    it('should update multiple fields', async () => {
      await runAsServiceRole(async () => {
        // Create using repository (uses transaction context)
        const orgData = OrganizationEntity.create({
          name: 'Original',
          type: 'company',
        });
        const created = await repository.create(orgData);
        // Verify initial isActive state
        expect(created.isActive).toBe(true);

        const updated = await repository.update(created.id, {
          name: 'Updated',
          isActive: false,
        });

        expect(updated.name).toBe('Updated');
        expect(updated.isActive).toBe(false);
      });
    });
  });

  describe('delete', () => {
    it('should delete organization from database', async () => {
      const fixture = createCompanyFixture({ name: 'To Delete' });
      await typeormRepository.save(fixture);

      await repository.delete(fixture.id);

      const found = await typeormRepository.findOne({
        where: { id: fixture.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete organization', async () => {
      await runAsServiceRole(async () => {
        // Create using repository (uses transaction context)
        const orgData = OrganizationEntity.create({
          name: 'To Soft Delete',
          type: 'company',
        });
        const created = await repository.create(orgData);

        await repository.softDelete(created.id);

        // Use getTransactionManager to get the correct repository
        const manager = getTransactionManager();
        const transactionalRepo = manager
          ? manager.getRepository(OrganizationSchema)
          : typeormRepository;

        const found = await transactionalRepo.findOne({
          where: { id: created.id },
          withDeleted: true,
        });
        expect(found).toBeDefined();
        expect(found?.deletedAt).toBeDefined();
      });
    });
  });

  describe('domain mapping', () => {
    it('should correctly map schema to domain entity', async () => {
      const fixture = createCompanyFixture({
        name: 'Mapping Test',
        slug: 'mapping-test',
        isActive: true,
      });
      await typeormRepository.save(fixture);

      const result = await repository.findById(fixture.id);

      expect(result).toBeInstanceOf(OrganizationEntity);
      expect(result?.name).toBe('Mapping Test');
      expect(result?.slug).toBe('mapping-test');
      expect(result?.type).toBe('company');
      expect(result?.isActive).toBe(true);
      expect(result?.settings).toBeDefined();
    });

    it('should include default settings in domain entity', async () => {
      const fixture = createCompanyFixture({ name: 'Settings Test' });
      await typeormRepository.save(fixture);

      const result = await repository.findById(fixture.id);

      expect(result?.settings).toBeDefined();
      expect(result?.settings.timezone).toBe('America/Sao_Paulo');
      expect(result?.settings.locale).toBe('pt-BR');
      expect(result?.settings.emociogramaEnabled).toBe(true);
    });
  });
});
