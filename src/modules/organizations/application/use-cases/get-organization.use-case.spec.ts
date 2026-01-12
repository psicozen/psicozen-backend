import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetOrganizationUseCase } from './get-organization.use-case';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';

describe('GetOrganizationUseCase', () => {
  let useCase: GetOrganizationUseCase;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findChildren: jest.fn(),
      findActiveByType: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrganizationUseCase,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetOrganizationUseCase>(GetOrganizationUseCase);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return an organization by id', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });
      mockOrg.id = 'org-123';

      organizationRepository.findById.mockResolvedValue(mockOrg);

      const result = await useCase.execute('org-123');

      expect(result).toEqual(mockOrg);
      expect(result.id).toBe('org-123');
      expect(result.name).toBe('Test Organization');
      expect(organizationRepository.findById).toHaveBeenCalledWith('org-123');
    });

    it('should throw NotFoundException if organization not found', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should return organization with all properties', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Full Organization',
        type: 'department',
        parentId: 'parent-123',
        settings: {
          timezone: 'America/New_York',
          alertThreshold: 7,
        },
      });
      mockOrg.id = 'org-456';

      organizationRepository.findById.mockResolvedValue(mockOrg);

      const result = await useCase.execute('org-456');

      expect(result.name).toBe('Full Organization');
      expect(result.type).toBe('department');
      expect(result.parentId).toBe('parent-123');
      expect(result.settings.timezone).toBe('America/New_York');
      expect(result.settings.alertThreshold).toBe(7);
      expect(result.isActive).toBe(true);
    });
  });
});
