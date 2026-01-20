import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateUserUseCase } from './create-user.use-case';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { SupabaseAdminService } from '../../../../core/infrastructure/supabase/supabase-admin.service';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let supabaseAdminService: jest.Mocked<SupabaseAdminService>;

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockSupabaseAdminService = {
      inviteUserByEmail: jest.fn(),
      createUser: jest.fn(),
      deleteUser: jest.fn(),
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: SupabaseAdminService,
          useValue: mockSupabaseAdminService,
        },
      ],
    }).compile();

    useCase = module.get<CreateUserUseCase>(CreateUserUseCase);
    userRepository = module.get(USER_REPOSITORY);
    supabaseAdminService = module.get(SupabaseAdminService);
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

      const supabaseUserId = 'supabase-user-123';
      const mockUser = UserEntity.create(dto.email, supabaseUserId, dto.firstName);
      mockUser.id = 'user-123';

      userRepository.findByEmail.mockResolvedValue(null);
      supabaseAdminService.inviteUserByEmail.mockResolvedValue({
        id: supabaseUserId,
        email: dto.email,
      });
      userRepository.create.mockResolvedValue(mockUser);

      const result = await useCase.execute(dto);

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(supabaseAdminService.inviteUserByEmail).toHaveBeenCalledWith(dto.email);
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

    it('should create user with custom preferences', async () => {
      const dto = {
        email: 'test@example.com',
        firstName: 'John',
        preferences: {
          theme: 'dark' as const,
          language: 'pt-BR',
        },
      };

      const supabaseUserId = 'supabase-user-456';

      userRepository.findByEmail.mockResolvedValue(null);
      supabaseAdminService.inviteUserByEmail.mockResolvedValue({
        id: supabaseUserId,
        email: dto.email,
      });
      userRepository.create.mockImplementation(async (user) => {
        const createdUser = new UserEntity(user);
        createdUser.id = 'user-123';
        return createdUser;
      });

      const result = await useCase.execute(dto);

      expect(result.preferences.theme).toBe('dark');
      expect(result.preferences.language).toBe('pt-BR');
      expect(supabaseAdminService.inviteUserByEmail).toHaveBeenCalledWith(dto.email);
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should skip Supabase invite if supabaseUserId is provided', async () => {
      const dto = {
        email: 'test@example.com',
        firstName: 'John',
        supabaseUserId: 'existing-supabase-id',
      };

      const mockUser = UserEntity.create(dto.email, dto.supabaseUserId, dto.firstName);
      mockUser.id = 'user-123';

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);

      const result = await useCase.execute(dto);

      expect(result.supabaseUserId).toBe('existing-supabase-id');
      expect(supabaseAdminService.inviteUserByEmail).not.toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if Supabase invite fails', async () => {
      const dto = {
        email: 'test@example.com',
        firstName: 'John',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      supabaseAdminService.inviteUserByEmail.mockRejectedValue(
        new Error('User already exists'),
      );

      await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });
});
