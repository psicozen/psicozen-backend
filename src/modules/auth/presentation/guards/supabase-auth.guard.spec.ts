import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { IS_PUBLIC_KEY } from '../../../../core/presentation/decorators/public.decorator';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let userRepository: any;
  let mockSupabaseClient: any;

  const mockUser = UserEntity.create(
    'test@example.com',
    'supabase-user-123',
    'John',
  );
  mockUser.id = 'user-uuid-123';

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Setup fresh mock
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({
        auth: {
          getUser: jest.fn(),
        },
      })),
    }));

    const { createClient } = require('@supabase/supabase-js');
    mockSupabaseClient = createClient();

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
        if (key === 'SUPABASE_PUBLISHABLE_KEY') return 'test-key';
        return null;
      }),
    };

    const mockUserRepository = {
      findBySupabaseUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    guard = module.get<SupabaseAuthGuard>(SupabaseAuthGuard);
    reflector = module.get(Reflector);
    userRepository = module.get(USER_REPOSITORY);

    // Get the supabase client instance from guard
    (guard as any).supabase = mockSupabaseClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });
  });

  describe('canActivate', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as any;
    });

    describe('when route is marked as @Public()', () => {
      it('should allow access without authentication', async () => {
        reflector.getAllAndOverride.mockReturnValue(true);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled();
      });
    });

    describe('when route is protected and token is valid', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'supabase-user-123',
              email: 'test@example.com',
              user_metadata: { first_name: 'John' },
            },
          },
          error: null,
        });
        userRepository.findBySupabaseUserId.mockResolvedValue(mockUser);
        userRepository.update.mockResolvedValue(mockUser);
      });

      it('should validate token and attach user to request', async () => {
        const request = mockExecutionContext.switchToHttp().getRequest();

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(
          'valid-token',
        );
        expect(request.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          supabaseUserId: mockUser.supabaseUserId,
        });
      });
    });

    describe('when token is missing', () => {
      it('should throw UnauthorizedException', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockExecutionContext.switchToHttp().getRequest = jest
          .fn()
          .mockReturnValue({
            headers: {},
          });

        await expect(
          guard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);
        await expect(
          guard.canActivate(mockExecutionContext),
        ).rejects.toThrow('No authentication token provided');
      });
    });

    describe('when token is invalid', () => {
      it('should throw UnauthorizedException', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        });

        await expect(
          guard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);
        await expect(
          guard.canActivate(mockExecutionContext),
        ).rejects.toThrow('Invalid or expired token');
      });
    });

    describe('when user account is disabled', () => {
      it('should throw UnauthorizedException', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'supabase-user-123',
              email: 'test@example.com',
            },
          },
          error: null,
        });

        const inactiveUser = new UserEntity({ ...mockUser, isActive: false });
        userRepository.findBySupabaseUserId.mockResolvedValue(inactiveUser);

        await expect(
          guard.canActivate(mockExecutionContext),
        ).rejects.toThrow(UnauthorizedException);
        await expect(
          guard.canActivate(mockExecutionContext),
        ).rejects.toThrow('User account is disabled');
      });
    });

    describe('when user does not exist locally', () => {
      it('should create user automatically', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'new-supabase-user',
              email: 'newuser@example.com',
              user_metadata: { first_name: 'New' },
            },
          },
          error: null,
        });

        userRepository.findBySupabaseUserId.mockResolvedValue(null);
        userRepository.create.mockResolvedValue(mockUser);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(userRepository.create).toHaveBeenCalled();
      });
    });
  });
});
