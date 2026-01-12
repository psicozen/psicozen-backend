import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateOrganizationUseCase } from './create-organization.use-case';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
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
    const createDto: CreateOrganizationDto = {
      name: 'Test Organization',
      type: 'company',
    };

    it('should create organization successfully', async () => {
      const mockOrganization = OrganizationEntity.create({
        name: createDto.name,
        type: createDto.type,
      });

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.create.mockResolvedValue(mockOrganization);

      const result = await useCase.execute(createDto);

      expect(result.name).toBe(createDto.name);
      expect(result.type).toBe(createDto.type);
      expect(result.slug).toBe('test-organization');
      expect(organizationRepository.findBySlug).toHaveBeenCalledWith(
        'test-organization',
      );
      expect(organizationRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      const existingOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });

      organizationRepository.findBySlug.mockResolvedValue(existingOrg);

      await expect(useCase.execute(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(organizationRepository.create).not.toHaveBeenCalled();
    });

    it('should create organization with custom settings', async () => {
      const dtoWithSettings: CreateOrganizationDto = {
        name: 'Test Organization',
        type: 'company',
        settings: {
          timezone: 'UTC',
          alertThreshold: 8,
        },
      };

      const mockOrganization = OrganizationEntity.create({
        name: dtoWithSettings.name,
        type: dtoWithSettings.type,
        settings: dtoWithSettings.settings,
      });

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.create.mockResolvedValue(mockOrganization);

      const result = await useCase.execute(dtoWithSettings);

      expect(result.settings.timezone).toBe('UTC');
      expect(result.settings.alertThreshold).toBe(8);
    });

    it('should create organization with parent', async () => {
      const parentOrg = OrganizationEntity.create({
        name: 'Parent Corp',
        type: 'company',
      });

      const dtoWithParent: CreateOrganizationDto = {
        name: 'Child Department',
        type: 'department',
        parentId: 'parent-uuid',
      };

      const mockOrganization = OrganizationEntity.create({
        name: dtoWithParent.name,
        type: dtoWithParent.type,
        parentId: dtoWithParent.parentId,
      });

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.findById.mockResolvedValue(parentOrg);
      organizationRepository.create.mockResolvedValue(mockOrganization);

      const result = await useCase.execute(dtoWithParent);

      expect(result.parentId).toBe('parent-uuid');
      expect(organizationRepository.findById).toHaveBeenCalledWith(
        'parent-uuid',
      );
    });

    it('should throw ConflictException if parent organization not found', async () => {
      const dtoWithParent: CreateOrganizationDto = {
        name: 'Child Department',
        type: 'department',
        parentId: 'non-existent-uuid',
      };

      organizationRepository.findBySlug.mockResolvedValue(null);
      organizationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(dtoWithParent)).rejects.toThrow(
        ConflictException,
      );
      expect(organizationRepository.create).not.toHaveBeenCalled();
    });
  });
});
