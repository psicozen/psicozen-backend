import { Test, TestingModule } from '@nestjs/testing';
import { ListOrganizationsUseCase } from './list-organizations.use-case';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

describe('ListOrganizationsUseCase', () => {
  let useCase: ListOrganizationsUseCase;
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
        ListOrganizationsUseCase,
        {
          provide: ORGANIZATION_REPOSITORY,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    useCase = module.get<ListOrganizationsUseCase>(ListOrganizationsUseCase);
    organizationRepository = module.get(ORGANIZATION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return paginated organizations', async () => {
      const mockOrg1 = OrganizationEntity.create({
        name: 'Organization 1',
        type: 'company',
      });
      mockOrg1.id = 'org-1';

      const mockOrg2 = OrganizationEntity.create({
        name: 'Organization 2',
        type: 'department',
      });
      mockOrg2.id = 'org-2';

      const paginatedResult = {
        data: [mockOrg1, mockOrg2],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      organizationRepository.findAll.mockResolvedValue(paginatedResult);

      const pagination = new PaginationDto();
      pagination.page = 1;
      pagination.limit = 10;

      const result = await useCase.execute(pagination);

      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(organizationRepository.findAll).toHaveBeenCalled();
    });

    it('should use default ordering by createdAt DESC', async () => {
      const paginatedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      organizationRepository.findAll.mockResolvedValue(paginatedResult);

      const pagination = new PaginationDto();
      pagination.page = 1;
      pagination.limit = 10;

      await useCase.execute(pagination);

      expect(organizationRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'DESC' },
        }),
      );
    });

    it('should use custom sorting when provided', async () => {
      const paginatedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      organizationRepository.findAll.mockResolvedValue(paginatedResult);

      const pagination = new PaginationDto();
      pagination.page = 1;
      pagination.limit = 10;
      pagination.sortBy = 'name';
      pagination.sortOrder = 'ASC';

      await useCase.execute(pagination);

      expect(organizationRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'ASC' },
        }),
      );
    });

    it('should return empty result when no organizations exist', async () => {
      const paginatedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      organizationRepository.findAll.mockResolvedValue(paginatedResult);

      const pagination = new PaginationDto();
      const result = await useCase.execute(pagination);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const mockOrg = OrganizationEntity.create({
        name: 'Organization',
        type: 'company',
      });

      const paginatedResult = {
        data: [mockOrg],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      organizationRepository.findAll.mockResolvedValue(paginatedResult);

      const pagination = new PaginationDto();
      pagination.page = 2;
      pagination.limit = 10;

      const result = await useCase.execute(pagination);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });
  });
});
