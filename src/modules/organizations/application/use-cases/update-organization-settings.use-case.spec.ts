import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateOrganizationSettingsUseCase } from './update-organization-settings.use-case';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { UpdateOrganizationSettingsDto } from '../dtos/update-organization-settings.dto';

describe('UpdateOrganizationSettingsUseCase', () => {
  let useCase: UpdateOrganizationSettingsUseCase;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      findById: jest.fn(),
      update: jest.fn(),
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
    const orgId = 'test-uuid';

    it('should update organization settings successfully', async () => {
      const existingOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });

      const updateDto: UpdateOrganizationSettingsDto = {
        timezone: 'UTC',
        alertThreshold: 8,
      };

      const updatedOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
        settings: {
          ...existingOrg.settings,
          timezone: 'UTC',
          alertThreshold: 8,
        },
      });

      organizationRepository.findById.mockResolvedValue(existingOrg);
      organizationRepository.update.mockResolvedValue(updatedOrg);

      const result = await useCase.execute(orgId, updateDto);

      expect(result.settings.timezone).toBe('UTC');
      expect(result.settings.alertThreshold).toBe(8);
      expect(organizationRepository.findById).toHaveBeenCalledWith(orgId);
      expect(organizationRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      const updateDto: UpdateOrganizationSettingsDto = {
        timezone: 'UTC',
      };

      await expect(useCase.execute('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(organizationRepository.update).not.toHaveBeenCalled();
    });

    it('should update only provided settings', async () => {
      const existingOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
        settings: {
          timezone: 'America/Sao_Paulo',
          locale: 'pt-BR',
          emociogramaEnabled: true,
          alertThreshold: 6,
          dataRetentionDays: 365,
          anonymityDefault: false,
        },
      });

      const updateDto: UpdateOrganizationSettingsDto = {
        alertThreshold: 9,
      };

      organizationRepository.findById.mockResolvedValue(existingOrg);
      organizationRepository.update.mockImplementation(async (_, domain) => {
        return domain as OrganizationEntity;
      });

      const result = await useCase.execute(orgId, updateDto);

      // Original settings should remain unchanged
      expect(result.settings.timezone).toBe('America/Sao_Paulo');
      expect(result.settings.locale).toBe('pt-BR');
      // Only alertThreshold should be updated
      expect(result.settings.alertThreshold).toBe(9);
    });

    it('should update multiple settings at once', async () => {
      const existingOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });

      const updateDto: UpdateOrganizationSettingsDto = {
        timezone: 'Europe/London',
        locale: 'en-GB',
        emociogramaEnabled: false,
        alertThreshold: 5,
        dataRetentionDays: 180,
        anonymityDefault: true,
      };

      organizationRepository.findById.mockResolvedValue(existingOrg);
      organizationRepository.update.mockImplementation(async (_, domain) => {
        return domain as OrganizationEntity;
      });

      const result = await useCase.execute(orgId, updateDto);

      expect(result.settings.timezone).toBe('Europe/London');
      expect(result.settings.locale).toBe('en-GB');
      expect(result.settings.emociogramaEnabled).toBe(false);
      expect(result.settings.alertThreshold).toBe(5);
      expect(result.settings.dataRetentionDays).toBe(180);
      expect(result.settings.anonymityDefault).toBe(true);
    });
  });
});
