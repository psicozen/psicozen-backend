import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateOrganizationUseCase } from './create-organization.use-case';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';

describe('CreateOrganizationUseCase', () => {
  let useCase: CreateOrganizationUseCase;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      findBySlug: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findChildren: jest.fn(),
      findActiveByType: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrganizationUseCase,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateOrganizationUseCase>(CreateOrganizationUseCase);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const validDto: CreateOrganizationDto = {
      name: 'Acme Corporation',
      type: 'company',
    };

    it('should create a new organization successfully', async () => {
      const mockOrg = OrganizationEntity.create({
        name: validDto.name,
        type: validDto.type,
      });
      mockOrg.id = 'org-123';

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.create.mockResolvedValue(mockOrg);

      const result = await useCase.execute(validDto);

      expect(result).toEqual(mockOrg);
      expect(result.name).toBe('Acme Corporation');
      expect(result.slug).toBe('acme-corporation');
      expect(result.type).toBe('company');
      expect(result.isActive).toBe(true);
      expect(organizationRepository.findBySlug).toHaveBeenCalledWith(
        'acme-corporation',
      );
      expect(organizationRepository.create).toHaveBeenCalled();
    });

    it('should create organization with custom settings', async () => {
      const dtoWithSettings: CreateOrganizationDto = {
        ...validDto,
        settings: {
          timezone: 'America/New_York',
          alertThreshold: 8,
        },
      };

      const mockOrg = OrganizationEntity.create({
        name: dtoWithSettings.name,
        type: dtoWithSettings.type,
        settings: dtoWithSettings.settings,
      });
      mockOrg.id = 'org-456';

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.create.mockResolvedValue(mockOrg);

      const result = await useCase.execute(dtoWithSettings);

      expect(result.settings.timezone).toBe('America/New_York');
      expect(result.settings.alertThreshold).toBe(8);
    });

    it('should create organization with parent', async () => {
      const parentOrg = OrganizationEntity.create({
        name: 'Parent Company',
        type: 'company',
      });
      parentOrg.id = 'parent-123';

      const dtoWithParent: CreateOrganizationDto = {
        name: 'Child Department',
        type: 'department',
        parentId: 'parent-123',
      };

      const mockOrg = OrganizationEntity.create({
        name: dtoWithParent.name,
        type: dtoWithParent.type,
        parentId: dtoWithParent.parentId,
      });
      mockOrg.id = 'org-789';

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.findById.mockResolvedValue(parentOrg);
      organizationRepository.create.mockResolvedValue(mockOrg);

      const result = await useCase.execute(dtoWithParent);

      expect(result.parentId).toBe('parent-123');
      expect(organizationRepository.findById).toHaveBeenCalledWith(
        'parent-123',
      );
    });

    it('should throw ConflictException if organization name already exists', async () => {
      const existingOrg = OrganizationEntity.create({
        name: validDto.name,
        type: 'company',
      });

      organizationRepository.findBySlug.mockResolvedValue(existingOrg);

      await expect(useCase.execute(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute(validDto)).rejects.toThrow(
        'Organization with this name already exists',
      );
      expect(organizationRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if parent organization not found', async () => {
      const dtoWithInvalidParent: CreateOrganizationDto = {
        name: 'Child Department',
        type: 'department',
        parentId: 'non-existent-id',
      };

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(dtoWithInvalidParent)).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute(dtoWithInvalidParent)).rejects.toThrow(
        'Parent organization not found',
      );
      expect(organizationRepository.create).not.toHaveBeenCalled();
    });
  });
});
