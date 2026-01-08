import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '../../../../core/domain/exceptions';
import { UpdateUserUseCase } from './update-user.use-case';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<UpdateUserUseCase>(UpdateUserUseCase);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123';
      const dto = {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Updated bio',
      };

      const mockUser = UserEntity.create('test@example.com', undefined, 'John');
      mockUser.id = userId;

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);

      const result = await useCase.execute(userId, dto);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.update).toHaveBeenCalledWith(userId, mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'non-existent';
      const dto = { firstName: 'Jane' };

      userRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });
});
