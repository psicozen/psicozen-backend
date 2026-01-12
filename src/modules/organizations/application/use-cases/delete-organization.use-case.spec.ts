import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DeleteOrganizationUseCase } from './delete-organization.use-case';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';

describe('DeleteOrganizationUseCase', () => {
  let useCase: DeleteOrganizationUseCase;
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
    it('should soft delete an organization successfully', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Test Organization',
        type: 'company',
      });
      mockOrg.id = 'org-123';

      organizationRepository.findById.mockResolvedValue(mockOrg);
      organizationRepository.findChildren.mockResolvedValue([]);
      organizationRepository.softDelete.mockResolvedValue(undefined);

      await useCase.execute('org-123');

      expect(organizationRepository.findById).toHaveBeenCalledWith('org-123');
      expect(organizationRepository.findChildren).toHaveBeenCalledWith(
        'org-123',
      );
      expect(organizationRepository.softDelete).toHaveBeenCalledWith('org-123');
    });

    it('should throw NotFoundException if organization not found', async () => {
      organizationRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        'Organization not found',
      );
      expect(organizationRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if organization has children', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Parent Organization',
        type: 'company',
      });
      mockOrg.id = 'parent-123';

      const childOrg = OrganizationEntity.create({
        name: 'Child Department',
        type: 'department',
        parentId: 'parent-123',
      });
      childOrg.id = 'child-456';

      organizationRepository.findById.mockResolvedValue(mockOrg);
      organizationRepository.findChildren.mockResolvedValue([childOrg]);

      await expect(useCase.execute('parent-123')).rejects.toThrow(
        ConflictException,
      );
      await expect(useCase.execute('parent-123')).rejects.toThrow(
        'Cannot delete organization with child organizations',
      );
      expect(organizationRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should delete organization without children', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Leaf Organization',
        type: 'team',
        parentId: 'parent-123',
      });
      mockOrg.id = 'leaf-789';

      organizationRepository.findById.mockResolvedValue(mockOrg);
      organizationRepository.findChildren.mockResolvedValue([]);
      organizationRepository.softDelete.mockResolvedValue(undefined);

      await expect(useCase.execute('leaf-789')).resolves.toBeUndefined();

      expect(organizationRepository.softDelete).toHaveBeenCalledWith(
        'leaf-789',
      );
    });

    it('should handle multiple children preventing deletion', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Company',
        type: 'company',
      });
      mockOrg.id = 'company-123';

      const child1 = OrganizationEntity.create({
        name: 'Department 1',
        type: 'department',
        parentId: 'company-123',
      });

      const child2 = OrganizationEntity.create({
        name: 'Department 2',
        type: 'department',
        parentId: 'company-123',
      });

      organizationRepository.findById.mockResolvedValue(mockOrg);
      organizationRepository.findChildren.mockResolvedValue([child1, child2]);

      await expect(useCase.execute('company-123')).rejects.toThrow(
        ConflictException,
      );
      expect(organizationRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
