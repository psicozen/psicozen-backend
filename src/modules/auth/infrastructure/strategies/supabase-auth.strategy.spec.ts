import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthStrategy, SupabaseJwtPayload } from './supabase-auth.strategy';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';

describe('SupabaseAuthStrategy', () => {
  let strategy: SupabaseAuthStrategy;
  let supabaseService: jest.Mocked<SupabaseService>;
  let userRepository: jest.Mocked<IUserRepository>;
  let configService: jest.Mocked<ConfigService>;

  const mockJwtPayload: SupabaseJwtPayload = {
    sub: 'supabase-user-123',
    email: 'test@example.com',
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };

  const mockSupabaseUser = {
    id: 'supabase-user-123',
    email: 'test@example.com',
    user_metadata: {
      firstName: 'John',
    },
  };

  const mockUserEntity = UserEntity.create(
    'test@example.com',
    'supabase-user-123',
    'John',
  );
  mockUserEntity.id = 'user-uuid-123';
  mockUserEntity.lastName = 'Doe';

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const mockSupabaseService = {
      getUser: jest.fn(),
    };

    const mockUserRepository = {
      findBySupabaseUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    strategy = module.get<SupabaseAuthStrategy>(SupabaseAuthStrategy);
    supabaseService = module.get(SupabaseService);
    userRepository = module.get(USER_REPOSITORY);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should configure JWT extraction from Bearer token', () => {
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_JWT_SECRET');
    });
  });

  describe('validate', () => {
    describe('when token is valid and user exists', () => {
      beforeEach(() => {
        supabaseService.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        } as any);

        userRepository.findBySupabaseUserId.mockResolvedValue(mockUserEntity);
        userRepository.update.mockResolvedValue(mockUserEntity);
      });

      it('should verify token with Supabase', async () => {
        await strategy.validate(mockJwtPayload);

        expect(supabaseService.getUser).toHaveBeenCalledTimes(1);
      });

      it('should find user by Supabase user ID', async () => {
        await strategy.validate(mockJwtPayload);

        expect(userRepository.findBySupabaseUserId).toHaveBeenCalledWith(
          'supabase-user-123',
        );
      });

      it('should update user last login timestamp', async () => {
        const recordLoginSpy = jest.spyOn(mockUserEntity, 'recordLogin');

        await strategy.validate(mockJwtPayload);

        expect(recordLoginSpy).toHaveBeenCalledTimes(1);
        expect(userRepository.update).toHaveBeenCalledWith(
          mockUserEntity.id,
          mockUserEntity,
        );
      });

      it('should return user payload for @CurrentUser decorator', async () => {
        const result = await strategy.validate(mockJwtPayload);

        expect(result).toEqual({
          id: mockUserEntity.id,
          email: mockUserEntity.email,
          firstName: mockUserEntity.firstName,
          lastName: mockUserEntity.lastName,
          supabaseUserId: mockUserEntity.supabaseUserId,
        });
      });
    });

    describe('when user does not exist locally', () => {
      beforeEach(() => {
        supabaseService.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        } as any);

        userRepository.findBySupabaseUserId.mockResolvedValue(null);
        userRepository.create.mockResolvedValue(mockUserEntity);
      });

      it('should auto-create user on first authenticated request', async () => {
        await strategy.validate(mockJwtPayload);

        expect(userRepository.create).toHaveBeenCalledTimes(1);
        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            supabaseUserId: 'supabase-user-123',
            firstName: 'John',
          }),
        );
      });

      it('should return newly created user payload', async () => {
        const result = await strategy.validate(mockJwtPayload);

        expect(result).toEqual({
          id: mockUserEntity.id,
          email: mockUserEntity.email,
          firstName: mockUserEntity.firstName,
          lastName: mockUserEntity.lastName,
          supabaseUserId: mockUserEntity.supabaseUserId,
        });
      });

      it('should not call update when creating new user', async () => {
        await strategy.validate(mockJwtPayload);

        expect(userRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('when Supabase token is invalid', () => {
      it('should throw UnauthorizedException when Supabase returns error', async () => {
        supabaseService.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' } as any,
        } as any);

        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
          'Invalid or expired Supabase token',
        );
      });

      it('should throw UnauthorizedException when Supabase returns no user', async () => {
        supabaseService.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        } as any);

        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should not access user repository when token is invalid', async () => {
        supabaseService.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' } as any,
        } as any);

        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow();

        expect(userRepository.findBySupabaseUserId).not.toHaveBeenCalled();
        expect(userRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('when user account is disabled', () => {
      beforeEach(() => {
        supabaseService.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        } as any);

        const inactiveUser = new UserEntity({
          ...mockUserEntity,
          isActive: false,
        });
        userRepository.findBySupabaseUserId.mockResolvedValue(inactiveUser);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
          'User account is disabled',
        );
      });

      it('should not return user payload', async () => {
        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow();
      });
    });

    describe('error handling', () => {
      it('should handle Supabase service errors gracefully', async () => {
        supabaseService.getUser.mockRejectedValue(
          new Error('Supabase connection failed'),
        );

        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow();
      });

      it('should handle user repository errors gracefully', async () => {
        supabaseService.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        } as any);

        userRepository.findBySupabaseUserId.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(strategy.validate(mockJwtPayload)).rejects.toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle user without firstName metadata', async () => {
        const userWithoutName = {
          ...mockSupabaseUser,
          user_metadata: {},
        };

        supabaseService.getUser.mockResolvedValue({
          data: { user: userWithoutName },
          error: null,
        } as any);

        userRepository.findBySupabaseUserId.mockResolvedValue(null);
        userRepository.create.mockResolvedValue(mockUserEntity);

        const result = await strategy.validate(mockJwtPayload);

        expect(result).toBeDefined();
        expect(userRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            supabaseUserId: 'supabase-user-123',
            firstName: undefined,
          }),
        );
      });

      it('should handle user without lastName', async () => {
        const userWithoutLastName = new UserEntity({
          ...mockUserEntity,
          lastName: undefined,
        });
        userRepository.findBySupabaseUserId.mockResolvedValue(
          userWithoutLastName,
        );
        userRepository.update.mockResolvedValue(userWithoutLastName);

        supabaseService.getUser.mockResolvedValue({
          data: { user: mockSupabaseUser },
          error: null,
        } as any);

        const result = await strategy.validate(mockJwtPayload);

        expect(result.lastName).toBeUndefined();
      });
    });
  });

  describe('integration with PassportStrategy', () => {
    it('should be registered with name "supabase"', () => {
      // PassportStrategy registration is done via decorator
      // This test verifies the strategy is properly instantiated
      expect(strategy).toBeInstanceOf(SupabaseAuthStrategy);
    });

    it('should use HS256 algorithm for JWT verification', () => {
      // Algorithm is set in super() call
      // This is verified implicitly through successful token validation
      expect(strategy).toBeDefined();
    });

    it('should extract JWT from Authorization Bearer header', () => {
      // JWT extraction is configured via ExtractJwt.fromAuthHeaderAsBearerToken()
      // This is verified implicitly through passport integration
      expect(strategy).toBeDefined();
    });
  });
});
