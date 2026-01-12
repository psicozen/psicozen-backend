import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteOrganizationUseCase } from './delete-organization.use-case';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';

describe('DeleteOrganizationUseCase', () => {
  let useCase: DeleteOrganizationUseCase;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      findById: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteOrganizationUseCase,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteOrganizationUseCase>(DeleteOrganizationUseCase);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const orgId = 'test-uuid';

    it('should soft delete organization by default', async () => {
      const existingOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });

      organizationRepository.findById.mockResolvedValue(existingOrg);
      organizationRepository.softDelete.mockResolvedValue(undefined);

      await useCase.execute(orgId);

      expect(organizationRepository.findById).toHaveBeenCalledWith(orgId);
      expect(organizationRepository.softDelete).toHaveBeenCalledWith(orgId);
      expect(organizationRepository.delete).not.toHaveBeenCalled();
    });

    it('should hard delete organization when flag is true', async () => {
      const existingOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });

      organizationRepository.findById.mockResolvedValue(existingOrg);
      organizationRepository.delete.mockResolvedValue(undefined);

      await useCase.execute(orgId, true);

      expect(organizationRepository.findById).toHaveBeenCalledWith(orgId);
      expect(organizationRepository.delete).toHaveBeenCalledWith(orgId);
      expect(organizationRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(organizationRepository.softDelete).not.toHaveBeenCalled();
      expect(organizationRepository.delete).not.toHaveBeenCalled();
    });

    it('should soft delete with explicit false flag', async () => {
      const existingOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });

      organizationRepository.findById.mockResolvedValue(existingOrg);
      organizationRepository.softDelete.mockResolvedValue(undefined);

      await useCase.execute(orgId, false);

      expect(organizationRepository.softDelete).toHaveBeenCalledWith(orgId);
      expect(organizationRepository.delete).not.toHaveBeenCalled();
    });
  });
});
