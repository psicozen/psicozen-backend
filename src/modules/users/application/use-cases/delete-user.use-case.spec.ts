import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '../../../../core/domain/exceptions';
import { DeleteUserUseCase } from './delete-user.use-case';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should soft delete user by default', async () => {
      const userId = 'user-123';
      const mockUser = UserEntity.create('test@example.com');
      mockUser.id = userId;

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.softDelete.mockResolvedValue();

      await useCase.execute(userId);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.softDelete).toHaveBeenCalledWith(userId);
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('should hard delete user when hardDelete is true', async () => {
      const userId = 'user-123';
      const mockUser = UserEntity.create('test@example.com');
      mockUser.id = userId;

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue();

      await useCase.execute(userId, true);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.delete).toHaveBeenCalledWith(userId);
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'non-existent';

      userRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(userId)).rejects.toThrow(NotFoundException);
      expect(userRepository.delete).not.toHaveBeenCalled();
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
