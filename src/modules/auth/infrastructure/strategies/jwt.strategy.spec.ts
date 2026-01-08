import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { IUserRepository, USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(USER_REPOSITORY);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user payload for valid active user', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        supabaseUserId: 'supabase-123',
      };

      const mockUser = UserEntity.create('test@example.com', 'supabase-123', 'Test');
      mockUser.id = 'user-123';
      mockUser.isActive = true;

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        supabaseUserId: mockUser.supabaseUserId,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload: JwtPayload = {
        sub: 'non-existent-user',
        email: 'test@example.com',
      };

      userRepository.findById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const mockUser = UserEntity.create('test@example.com');
      mockUser.id = 'user-123';
      mockUser.isActive = false;

      userRepository.findById.mockResolvedValue(mockUser);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow('User is inactive');
    });
  });
});
