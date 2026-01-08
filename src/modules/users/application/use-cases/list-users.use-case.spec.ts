import { Test, TestingModule } from '@nestjs/testing';
import { ListUsersUseCase } from './list-users.use-case';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const mockUserRepository = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListUsersUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<ListUsersUseCase>(ListUsersUseCase);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should list users with default pagination', async () => {
      const pagination = new PaginationDto();
      const mockUsers = [
        UserEntity.create('user1@example.com'),
        UserEntity.create('user2@example.com'),
      ];

      const mockResult = {
        data: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      userRepository.findAll.mockResolvedValue(mockResult);

      const result = await useCase.execute(pagination);

      expect(result).toEqual(mockResult);
      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'DESC' },
      });
    });

    it('should list users with custom pagination', async () => {
      const pagination = new PaginationDto();
      pagination.page = 2;
      pagination.limit = 5;
      pagination.sortBy = 'email';
      pagination.sortOrder = 'ASC';

      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      };

      userRepository.findAll.mockResolvedValue(mockResult);

      const result = await useCase.execute(pagination);

      expect(result).toEqual(mockResult);
      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { email: 'ASC' },
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

      userRepository.findAll.mockResolvedValue(mockResult);

      const result = await useCase.execute(pagination);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
