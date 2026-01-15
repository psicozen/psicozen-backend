import { Test, TestingModule } from '@nestjs/testing';
import { LogoutUseCase } from './logout.use-case';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const mockSupabaseService = {
      signOut: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
    supabaseService = module.get(SupabaseService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should sign out from Supabase successfully', async () => {
      const supabaseUserId = 'supabase-user-123';

      supabaseService.signOut.mockResolvedValue(undefined);

      const result = await useCase.execute(supabaseUserId);

      expect(result.message).toBe('Logged out successfully');
      expect(supabaseService.signOut).toHaveBeenCalledTimes(1);
    });

    it('should handle Supabase errors gracefully', async () => {
      const supabaseUserId = 'supabase-user-123';

      supabaseService.signOut.mockRejectedValue(
        new Error('Supabase signOut error'),
      );

      await expect(useCase.execute(supabaseUserId)).rejects.toThrow(
        'Supabase signOut error',
      );
    });
  });
});
