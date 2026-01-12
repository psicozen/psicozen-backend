import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetOrganizationByIdUseCase } from './get-organization-by-id.use-case';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';

describe('GetOrganizationByIdUseCase', () => {
  let useCase: GetOrganizationByIdUseCase;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrganizationByIdUseCase,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetOrganizationByIdUseCase>(
      GetOrganizationByIdUseCase,
    );
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return organization when found', async () => {
      const mockOrganization = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });

      organizationRepository.findById.mockResolvedValue(mockOrganization);

      const result = await useCase.execute('test-uuid');

      expect(result).toEqual(mockOrganization);
      expect(organizationRepository.findById).toHaveBeenCalledWith('test-uuid');
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return organization with all properties', async () => {
      const mockOrganization = OrganizationEntity.create({
        name: 'Full Organization',
        type: 'department',
        parentId: 'parent-uuid',
        settings: {
          timezone: 'UTC',
          locale: 'en-US',
          emociogramaEnabled: false,
          alertThreshold: 7,
          dataRetentionDays: 180,
          anonymityDefault: true,
        },
      });

      organizationRepository.findById.mockResolvedValue(mockOrganization);

      const result = await useCase.execute('test-uuid');

      expect(result.name).toBe('Full Organization');
      expect(result.type).toBe('department');
      expect(result.parentId).toBe('parent-uuid');
      expect(result.settings.timezone).toBe('UTC');
      expect(result.settings.alertThreshold).toBe(7);
    });
  });
});
