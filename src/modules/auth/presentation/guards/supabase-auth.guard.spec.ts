import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { IAuthService } from '../../domain/services/auth.service.interface';
import { AUTH_SERVICE } from '../../domain/services/auth.service.interface';
import { SyncUserWithSupabaseUseCase } from '../../application/use-cases/sync-user-with-supabase.use-case';
import { UserEntity } from '../../../users/domain/entities/user.entity';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: jest.Mocked<IAuthService>;
  let syncUserUseCase: jest.Mocked<SyncUserWithSupabaseUseCase>;

  const mockUser = UserEntity.create(
    'test@example.com',
    'supabase-user-123',
    'John',
  );
  (mockUser as any).id = 'user-uuid-123';

  const mockAuthenticatedUser = {
    id: 'supabase-user-123',
    email: 'test@example.com',
    firstName: 'John',
    metadata: {},
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockAuthService: jest.Mocked<IAuthService> = {
      validateToken: jest.fn(),
      signOut: jest.fn(),
    };

    const mockSyncUserUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AUTH_SERVICE,
          useValue: mockAuthService,
        },
        {
          provide: SyncUserWithSupabaseUseCase,
          useValue: mockSyncUserUseCase,
        },
      ],
    }).compile();

    guard = module.get<SupabaseAuthGuard>(SupabaseAuthGuard);
    reflector = module.get(Reflector);
    authService = module.get(AUTH_SERVICE);
    syncUserUseCase = module.get(SyncUserWithSupabaseUseCase);
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
        expect(authService.validateToken).not.toHaveBeenCalled();
        expect(syncUserUseCase.execute).not.toHaveBeenCalled();
      });
    });

    describe('when route is protected and token is valid', () => {
      beforeEach(() => {
        reflector.getAllAndOverride.mockReturnValue(false);
        authService.validateToken.mockResolvedValue(mockAuthenticatedUser);
        syncUserUseCase.execute.mockResolvedValue(mockUser);
      });

      it('should validate token using auth service', async () => {
        await guard.canActivate(mockExecutionContext);

        expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
      });

      it('should sync user using use case', async () => {
        await guard.canActivate(mockExecutionContext);

        expect(syncUserUseCase.execute).toHaveBeenCalledWith(
          mockAuthenticatedUser,
        );
      });

      it('should attach user to request', async () => {
        const request = mockExecutionContext.switchToHttp().getRequest();

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
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

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'No authentication token provided',
        );
      });
    });

    describe('when token is invalid', () => {
      it('should throw UnauthorizedException', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        authService.validateToken.mockResolvedValue(null);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'Invalid or expired token',
        );
      });
    });

    describe('when user account is disabled', () => {
      it('should throw UnauthorizedException', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        authService.validateToken.mockResolvedValue(mockAuthenticatedUser);

        const inactiveUser = UserEntity.create(
          'test@example.com',
          'supabase-user-123',
          'John',
        );
        (inactiveUser as any).isActive = false;

        syncUserUseCase.execute.mockResolvedValue(inactiveUser);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'User account is disabled',
        );
      });
    });

    describe('error handling', () => {
      it('should wrap generic errors in UnauthorizedException', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        authService.validateToken.mockRejectedValue(new Error('Generic error'));

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'Authentication failed',
        );
      });

      it('should preserve UnauthorizedException errors', async () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        authService.validateToken.mockRejectedValue(
          new UnauthorizedException('Specific error'),
        );

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          'Specific error',
        );
      });
    });
  });
});
