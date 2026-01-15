import { Test, TestingModule } from '@nestjs/testing';
import { SyncUserWithSupabaseUseCase } from './sync-user-with-supabase.use-case';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import type { AuthenticatedUser } from '../../domain/services/auth.service.interface';

describe('SyncUserWithSupabaseUseCase', () => {
  let useCase: SyncUserWithSupabaseUseCase;
  let userRepository: jest.Mocked<IUserRepository>;

  const mockAuthenticatedUser: AuthenticatedUser = {
    id: 'supabase-user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    metadata: {},
  };

  const mockExistingUser = UserEntity.create(
    'test@example.com',
    'supabase-user-123',
    'John',
  );
  (mockExistingUser as any).id = 'user-uuid-123';

  beforeEach(async () => {
    const mockUserRepository: Partial<jest.Mocked<IUserRepository>> = {
      findBySupabaseUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncUserWithSupabaseUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<SyncUserWithSupabaseUseCase>(
      SyncUserWithSupabaseUseCase,
    );
    userRepository = module.get(USER_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    describe('when user exists in local database', () => {
      it('should update last login and return existing user', async () => {
        userRepository.findBySupabaseUserId.mockResolvedValue(mockExistingUser);
        userRepository.update.mockResolvedValue(mockExistingUser);

        const result = await useCase.execute(mockAuthenticatedUser);

        expect(result).toBe(mockExistingUser);
        expect(userRepository.findBySupabaseUserId).toHaveBeenCalledWith(
          mockAuthenticatedUser.id,
        );
        expect(userRepository.update).toHaveBeenCalledWith(
          mockExistingUser.id,
          mockExistingUser,
        );
      });

      it('should call recordLogin on existing user entity', async () => {
        const recordLoginSpy = jest.spyOn(mockExistingUser, 'recordLogin');
        userRepository.findBySupabaseUserId.mockResolvedValue(mockExistingUser);
        userRepository.update.mockResolvedValue(mockExistingUser);

        await useCase.execute(mockAuthenticatedUser);

        expect(recordLoginSpy).toHaveBeenCalled();
      });
    });

    describe('when user does not exist in local database', () => {
      it('should create new user automatically', async () => {
        const newUser = UserEntity.create(
          mockAuthenticatedUser.email,
          mockAuthenticatedUser.id,
          mockAuthenticatedUser.firstName,
        );

        userRepository.findBySupabaseUserId.mockResolvedValue(null);
        userRepository.create.mockResolvedValue(newUser);

        const result = await useCase.execute(mockAuthenticatedUser);

        expect(result).toBe(newUser);
        expect(userRepository.findBySupabaseUserId).toHaveBeenCalledWith(
          mockAuthenticatedUser.id,
        );
        expect(userRepository.create).toHaveBeenCalled();
      });

      it('should extract firstName from metadata if not provided directly', async () => {
        const authUserWithMetadata: AuthenticatedUser = {
          id: 'supabase-user-456',
          email: 'user@example.com',
          metadata: { first_name: 'Jane', firstName: 'Jane' },
        };

        const newUser = UserEntity.create(
          authUserWithMetadata.email,
          authUserWithMetadata.id,
          'Jane',
        );

        userRepository.findBySupabaseUserId.mockResolvedValue(null);
        userRepository.create.mockResolvedValue(newUser);

        await useCase.execute(authUserWithMetadata);

        expect(userRepository.create).toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should propagate repository errors', async () => {
        userRepository.findBySupabaseUserId.mockRejectedValue(
          new Error('Database connection error'),
        );

        await expect(useCase.execute(mockAuthenticatedUser)).rejects.toThrow(
          'Database connection error',
        );
      });

      it('should propagate create errors', async () => {
        userRepository.findBySupabaseUserId.mockResolvedValue(null);
        userRepository.create.mockRejectedValue(
          new Error('User creation failed'),
        );

        await expect(useCase.execute(mockAuthenticatedUser)).rejects.toThrow(
          'User creation failed',
        );
      });
    });
  });
});
