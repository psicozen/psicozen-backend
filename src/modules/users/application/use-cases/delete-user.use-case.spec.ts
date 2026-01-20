import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '../../../../core/domain/exceptions';
import { DeleteUserUseCase } from './delete-user.use-case';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { SupabaseAdminService } from '../../../../core/infrastructure/supabase/supabase-admin.service';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let supabaseAdminService: jest.Mocked<SupabaseAdminService>;

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      findByIdWithDeleted: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockSupabaseAdminService = {
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserUseCase,
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

    useCase = module.get<DeleteUserUseCase>(DeleteUserUseCase);
    userRepository = module.get(USER_REPOSITORY);
    supabaseAdminService = module.get(SupabaseAdminService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should soft delete user by default and delete from Supabase', async () => {
      const userId = 'user-123';
      const supabaseUserId = 'supabase-123';
      const mockUser = UserEntity.create('test@example.com', supabaseUserId);
      mockUser.id = userId;

      userRepository.findByIdWithDeleted.mockResolvedValue(mockUser);
      supabaseAdminService.deleteUser.mockResolvedValue();
      userRepository.softDelete.mockResolvedValue();

      await useCase.execute(userId);

      expect(userRepository.findByIdWithDeleted).toHaveBeenCalledWith(userId);
      expect(supabaseAdminService.deleteUser).toHaveBeenCalledWith(supabaseUserId);
      expect(userRepository.softDelete).toHaveBeenCalledWith(userId);
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('should hard delete user when hardDelete is true', async () => {
      const userId = 'user-123';
      const supabaseUserId = 'supabase-123';
      const mockUser = UserEntity.create('test@example.com', supabaseUserId);
      mockUser.id = userId;

      userRepository.findByIdWithDeleted.mockResolvedValue(mockUser);
      supabaseAdminService.deleteUser.mockResolvedValue();
      userRepository.delete.mockResolvedValue();

      await useCase.execute(userId, true);

      expect(userRepository.findByIdWithDeleted).toHaveBeenCalledWith(userId);
      expect(supabaseAdminService.deleteUser).toHaveBeenCalledWith(supabaseUserId);
      expect(userRepository.delete).toHaveBeenCalledWith(userId);
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'non-existent';

      userRepository.findByIdWithDeleted.mockResolvedValue(null);

      await expect(useCase.execute(userId)).rejects.toThrow(NotFoundException);
      expect(supabaseAdminService.deleteUser).not.toHaveBeenCalled();
      expect(userRepository.delete).not.toHaveBeenCalled();
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should skip Supabase deletion if user has no supabaseUserId', async () => {
      const userId = 'user-123';
      const mockUser = UserEntity.create('test@example.com');
      mockUser.id = userId;
      mockUser.supabaseUserId = undefined;

      userRepository.findByIdWithDeleted.mockResolvedValue(mockUser);
      userRepository.softDelete.mockResolvedValue();

      await useCase.execute(userId);

      expect(supabaseAdminService.deleteUser).not.toHaveBeenCalled();
      expect(userRepository.softDelete).toHaveBeenCalledWith(userId);
    });

    it('should continue local deletion even if Supabase deletion fails', async () => {
      const userId = 'user-123';
      const supabaseUserId = 'supabase-123';
      const mockUser = UserEntity.create('test@example.com', supabaseUserId);
      mockUser.id = userId;

      userRepository.findByIdWithDeleted.mockResolvedValue(mockUser);
      supabaseAdminService.deleteUser.mockRejectedValue(new Error('Supabase error'));
      userRepository.softDelete.mockResolvedValue();

      await useCase.execute(userId);

      expect(supabaseAdminService.deleteUser).toHaveBeenCalledWith(supabaseUserId);
      expect(userRepository.softDelete).toHaveBeenCalledWith(userId);
    });

    it('should hard delete previously soft-deleted user and cleanup Supabase', async () => {
      const userId = 'user-123';
      const supabaseUserId = 'supabase-123';
      const mockUser = UserEntity.create('test@example.com', supabaseUserId);
      mockUser.id = userId;
      mockUser.deletedAt = new Date(); // User was already soft-deleted

      userRepository.findByIdWithDeleted.mockResolvedValue(mockUser);
      supabaseAdminService.deleteUser.mockResolvedValue();
      userRepository.delete.mockResolvedValue();

      await useCase.execute(userId);

      expect(supabaseAdminService.deleteUser).toHaveBeenCalledWith(supabaseUserId);
      expect(userRepository.delete).toHaveBeenCalledWith(userId);
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});
