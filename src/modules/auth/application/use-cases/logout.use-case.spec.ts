import { Test, TestingModule } from '@nestjs/testing';
import { LogoutUseCase } from './logout.use-case';
import type { IAuthService } from '../../domain/services/auth.service.interface';
import { AUTH_SERVICE } from '../../domain/services/auth.service.interface';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let authService: jest.Mocked<IAuthService>;

  beforeEach(async () => {
    const mockAuthService: jest.Mocked<IAuthService> = {
      signOut: jest.fn(),
      validateToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        {
          provide: AUTH_SERVICE,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
    authService = module.get(AUTH_SERVICE);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should sign out successfully using auth service', async () => {
      const supabaseUserId = 'supabase-user-123';

      authService.signOut.mockResolvedValue(undefined);

      const result = await useCase.execute(supabaseUserId);

      expect(result.message).toBe('Logged out successfully');
      expect(authService.signOut).toHaveBeenCalledTimes(1);
    });

    it('should handle auth service errors gracefully', async () => {
      const supabaseUserId = 'supabase-user-123';

      authService.signOut.mockRejectedValue(
        new Error('Auth service signOut error'),
      );

      await expect(useCase.execute(supabaseUserId)).rejects.toThrow(
        'Auth service signOut error',
      );
    });
  });
});
