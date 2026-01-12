import { Test, TestingModule } from '@nestjs/testing';
import { ListOrganizationsUseCase } from './list-organizations.use-case';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../domain/repositories/organization.repository.interface';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

describe('ListOrganizationsUseCase', () => {
  let useCase: ListOrganizationsUseCase;
  let organizationRepository: jest.Mocked<IOrganizationRepository>;

  beforeEach(async () => {
    const mockOrganizationRepository = {
      findAll: jest.fn(),
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
    it('should list organizations with default pagination', async () => {
      const pagination = new PaginationDto();
      const mockOrganizations = [
        OrganizationEntity.create({ name: 'Org 1', type: 'company' }),
        OrganizationEntity.create({ name: 'Org 2', type: 'department' }),
      ];

      const mockResult = {
        data: mockOrganizations,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      organizationRepository.findAll.mockResolvedValue(mockResult);

      const result = await useCase.execute(pagination);

      expect(result).toEqual(mockResult);
      expect(organizationRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'DESC' },
      });
    });

    it('should list organizations with custom pagination', async () => {
      const pagination = new PaginationDto();
      pagination.page = 2;
      pagination.limit = 5;
      pagination.sortBy = 'name';
      pagination.sortOrder = 'ASC';

      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      };

      organizationRepository.findAll.mockResolvedValue(mockResult);

      const result = await useCase.execute(pagination);

      expect(result).toEqual(mockResult);
      expect(organizationRepository.findAll).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { name: 'ASC' },
      });
    });

    it('should handle empty results', async () => {
      const pagination = new PaginationDto();
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      organizationRepository.findAll.mockResolvedValue(mockResult);

      const result = await useCase.execute(pagination);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should calculate correct skip value for page 3', async () => {
      const pagination = new PaginationDto();
      pagination.page = 3;
      pagination.limit = 10;

      const mockResult = {
        data: [],
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
      };

      organizationRepository.findAll.mockResolvedValue(mockResult);

      await useCase.execute(pagination);

      expect(organizationRepository.findAll).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        orderBy: { createdAt: 'DESC' },
      });
    });

    it('should sort by slug descending', async () => {
      const pagination = new PaginationDto();
      pagination.sortBy = 'slug';
      pagination.sortOrder = 'DESC';

      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      organizationRepository.findAll.mockResolvedValue(mockResult);

      await useCase.execute(pagination);

      expect(organizationRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { slug: 'DESC' },
      });
    });
  });
});
