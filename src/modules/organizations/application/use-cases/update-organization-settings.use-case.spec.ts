import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateOrganizationSettingsUseCase } from './update-organization-settings.use-case';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { UpdateOrganizationSettingsDto } from '../dtos/update-organization-settings.dto';
import { ValidationException } from '../../../../core/domain/exceptions/validation.exception';

describe('UpdateOrganizationSettingsUseCase', () => {
  let useCase: UpdateOrganizationSettingsUseCase;
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
        UpdateOrganizationSettingsUseCase,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateOrganizationSettingsUseCase>(
      UpdateOrganizationSettingsUseCase,
    );
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should update organization settings successfully', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });
      mockOrg.id = 'org-123';

      const updatedOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
        settings: {
          timezone: 'America/New_York',
          alertThreshold: 8,
        },
      });
      updatedOrg.id = 'org-123';

      organizationRepository.findById.mockResolvedValue(mockOrg);
      organizationRepository.update.mockResolvedValue(updatedOrg);

      const dto: UpdateOrganizationSettingsDto = {
        timezone: 'America/New_York',
        alertThreshold: 8,
      };

      const result = await useCase.execute('org-123', dto);

      expect(result.settings.timezone).toBe('America/New_York');
      expect(result.settings.alertThreshold).toBe(8);
      expect(organizationRepository.findById).toHaveBeenCalledWith('org-123');
      expect(organizationRepository.update).toHaveBeenCalledWith(
        'org-123',
        expect.any(OrganizationEntity),
      );
    });

    it('should update partial settings', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });
      mockOrg.id = 'org-123';

      organizationRepository.findById.mockResolvedValue(mockOrg);
      organizationRepository.update.mockImplementation(async (_, entity) => {
        return entity as OrganizationEntity;
      });

      const dto: UpdateOrganizationSettingsDto = {
        emociogramaEnabled: false,
      };

      const result = await useCase.execute('org-123', dto);

      expect(result.settings.emociogramaEnabled).toBe(false);
      // Other settings should remain default
      expect(result.settings.timezone).toBe('America/Sao_Paulo');
      expect(result.settings.alertThreshold).toBe(6);
    });

    it('should throw NotFoundException if organization not found', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      const dto: UpdateOrganizationSettingsDto = {
        timezone: 'America/New_York',
      };

      await expect(useCase.execute('non-existent-id', dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent-id', dto)).rejects.toThrow(
        'Organization not found',
      );
      expect(organizationRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ValidationException for invalid alertThreshold', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });
      mockOrg.id = 'org-123';

      organizationRepository.findById.mockResolvedValue(mockOrg);

      const dto: UpdateOrganizationSettingsDto = {
        alertThreshold: 15, // Invalid: must be 1-10
      };

      await expect(useCase.execute('org-123', dto)).rejects.toThrow(
        ValidationException,
      );
      expect(organizationRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ValidationException for invalid dataRetentionDays', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });
      mockOrg.id = 'org-123';

      organizationRepository.findById.mockResolvedValue(mockOrg);

      const dto: UpdateOrganizationSettingsDto = {
        dataRetentionDays: 5000, // Invalid: must be 1-3650
      };

      await expect(useCase.execute('org-123', dto)).rejects.toThrow(
        ValidationException,
      );
      expect(organizationRepository.update).not.toHaveBeenCalled();
    });

    it('should update multiple settings at once', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });
      mockOrg.id = 'org-123';

      organizationRepository.findById.mockResolvedValue(mockOrg);
      organizationRepository.update.mockImplementation(async (_, entity) => {
        return entity as OrganizationEntity;
      });

      const dto: UpdateOrganizationSettingsDto = {
        timezone: 'Europe/London',
        locale: 'en-GB',
        alertThreshold: 5,
        dataRetentionDays: 730,
        anonymityDefault: true,
      };

      const result = await useCase.execute('org-123', dto);

      expect(result.settings.timezone).toBe('Europe/London');
      expect(result.settings.locale).toBe('en-GB');
      expect(result.settings.alertThreshold).toBe(5);
      expect(result.settings.dataRetentionDays).toBe(730);
      expect(result.settings.anonymityDefault).toBe(true);
    });
  });
});
