import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.use-case';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create a new user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer',
      };

      const mockUser = UserEntity.create(dto.email, undefined, dto.firstName);
      mockUser.id = 'user-123';

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);

      const result = await useCase.execute(dto);

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto = {
        email: 'existing@example.com',
        firstName: 'John',
      };

      const existingUser = UserEntity.create(dto.email);
      userRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
      await expect(useCase.execute(dto)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });
});
