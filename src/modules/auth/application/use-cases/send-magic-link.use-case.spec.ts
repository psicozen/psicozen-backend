import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SendMagicLinkUseCase } from './send-magic-link.use-case';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';

describe('SendMagicLinkUseCase', () => {
  let useCase: SendMagicLinkUseCase;
  let supabaseService: jest.Mocked<SupabaseService>;

  beforeEach(async () => {
    const mockSupabaseService = {
      signInWithOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendMagicLinkUseCase,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    useCase = module.get<SendMagicLinkUseCase>(SendMagicLinkUseCase);
    supabaseService = module.get(SupabaseService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should send magic link successfully', async () => {
      const dto = {
        email: 'test@example.com',
        redirectTo: 'http://localhost:3001/callback',
      };

      supabaseService.signInWithOtp.mockResolvedValue({
        data: {},
        error: null,
      } as any);

      const result = await useCase.execute(dto);

      expect(result.message).toBe(
        'Magic link sent successfully. Please check your email.',
      );
      expect(supabaseService.signInWithOtp).toHaveBeenCalledWith({
        email: dto.email,
        options: {
          emailRedirectTo: dto.redirectTo,
          shouldCreateUser: true,
        },
      });
    });

    it('should throw BadRequestException when Supabase returns error', async () => {
      const dto = {
        email: 'test@example.com',
      };

      supabaseService.signInWithOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email' },
      } as any);

      await expect(useCase.execute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on unexpected error', async () => {
      const dto = {
        email: 'test@example.com',
      };

      supabaseService.signInWithOtp.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(useCase.execute(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
