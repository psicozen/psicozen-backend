import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationRepository } from './organization.repository';
import { OrganizationSchema } from '../persistence/organization.schema';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { DEFAULT_ORGANIZATION_SETTINGS } from '../../domain/types/organization-settings.types';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let typeOrmRepository: jest.Mocked<Repository<OrganizationSchema>>;

  const mockSchema: OrganizationSchema = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-organization',
    type: 'company',
    settings: {
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      emociogramaEnabled: true,
      alertThreshold: 6,
      dataRetentionDays: 365,
      anonymityDefault: false,
    },
    parentId: undefined,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: undefined,
  } as OrganizationSchema;

  beforeEach(async () => {
    const mockTypeOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationRepository,
        {
          provide: getRepositoryToken(OrganizationSchema),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<OrganizationRepository>(OrganizationRepository);
    typeOrmRepository = module.get(getRepositoryToken(OrganizationSchema));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find organization by id', async () => {
      typeOrmRepository.findOne.mockResolvedValue(mockSchema);

      const result = await repository.findById('org-123');

      expect(result).toBeInstanceOf(OrganizationEntity);
      expect(result?.id).toBe('org-123');
      expect(result?.name).toBe('Test Organization');
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-123' },
      });
    });

    it('should return null when organization not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find organization by slug', async () => {
      typeOrmRepository.findOne.mockResolvedValue(mockSchema);

      const result = await repository.findBySlug('test-organization');

      expect(result).toBeInstanceOf(OrganizationEntity);
      expect(result?.slug).toBe('test-organization');
      expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-organization' },
      });
    });

    it('should return null when organization not found by slug', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findBySlug('non-existent-slug');

      expect(result).toBeNull();
    });
  });

  describe('findChildren', () => {
    it('should find child organizations by parent id', async () => {
      const childSchema1 = { ...mockSchema, id: 'child-1', name: 'Child 1' };
      const childSchema2 = { ...mockSchema, id: 'child-2', name: 'Child 2' };

      typeOrmRepository.find.mockResolvedValue([childSchema1, childSchema2]);

      const result = await repository.findChildren('parent-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(OrganizationEntity);
      expect(result[1]).toBeInstanceOf(OrganizationEntity);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: { parentId: 'parent-123' },
      });
    });

    it('should return empty array when no children found', async () => {
      typeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findChildren('parent-without-children');

      expect(result).toHaveLength(0);
    });
  });

  describe('findActiveByType', () => {
    it('should find active organizations by type', async () => {
      const companySchema1 = { ...mockSchema, id: 'company-1' };
      const companySchema2 = { ...mockSchema, id: 'company-2' };

      typeOrmRepository.find.mockResolvedValue([
        companySchema1,
        companySchema2,
      ]);

      const result = await repository.findActiveByType('company');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(OrganizationEntity);
      expect(typeOrmRepository.find).toHaveBeenCalledWith({
        where: { type: 'company', isActive: true },
      });
    });

    it('should return empty array when no active organizations of type found', async () => {
      typeOrmRepository.find.mockResolvedValue([]);

      const result = await repository.findActiveByType('team');

      expect(result).toHaveLength(0);
    });
  });

  describe('toDomain', () => {
    it('should convert schema to domain entity', () => {
      const entity = repository.toDomain(mockSchema);

      expect(entity).toBeInstanceOf(OrganizationEntity);
      expect(entity.id).toBe(mockSchema.id);
      expect(entity.name).toBe(mockSchema.name);
      expect(entity.slug).toBe(mockSchema.slug);
      expect(entity.type).toBe(mockSchema.type);
      expect(entity.settings).toEqual(mockSchema.settings);
      expect(entity.isActive).toBe(mockSchema.isActive);
    });

    it('should merge settings with defaults when partial settings are provided', () => {
      const schemaWithPartialSettings = {
        ...mockSchema,
        settings: { timezone: 'UTC' } as any,
      };

      const entity = repository.toDomain(schemaWithPartialSettings);

      expect(entity.settings.timezone).toBe('UTC');
      expect(entity.settings.locale).toBe(DEFAULT_ORGANIZATION_SETTINGS.locale);
      expect(entity.settings.emociogramaEnabled).toBe(
        DEFAULT_ORGANIZATION_SETTINGS.emociogramaEnabled,
      );
    });
  });

  describe('toEntity', () => {
    it('should convert domain to schema', () => {
      const domain = OrganizationEntity.create({
        name: 'New Organization',
        type: 'company',
      });
      domain.id = 'new-org-123';

      const schema = repository.toEntity(domain);

      expect(schema).toBeInstanceOf(OrganizationSchema);
      expect(schema.name).toBe(domain.name);
      expect(schema.slug).toBe(domain.slug);
      expect(schema.type).toBe(domain.type);
      expect(schema.settings).toEqual(domain.settings);
      expect(schema.isActive).toBe(domain.isActive);
    });

    it('should handle partial domain entity', () => {
      const partialDomain: Partial<OrganizationEntity> = {
        name: 'Updated Name',
      };

      const schema = repository.toEntity(partialDomain);

      expect(schema).toBeInstanceOf(OrganizationSchema);
      expect(schema.name).toBe('Updated Name');
      expect(schema.id).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new organization', async () => {
      const newOrg = OrganizationEntity.create({
        name: 'New Organization',
        type: 'company',
      });

      typeOrmRepository.save.mockResolvedValue({
        ...mockSchema,
        id: 'new-org-id',
        name: 'New Organization',
        slug: 'new-organization',
      });

      const result = await repository.create(newOrg);

      expect(result).toBeInstanceOf(OrganizationEntity);
      expect(result.name).toBe('New Organization');
      expect(typeOrmRepository.save).toHaveBeenCalled();
    });
  });
});
