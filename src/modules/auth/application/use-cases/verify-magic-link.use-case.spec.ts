import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VerifyMagicLinkUseCase } from './verify-magic-link.use-case';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface';
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from '../../domain/repositories/session.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';

describe('VerifyMagicLinkUseCase', () => {
  let useCase: VerifyMagicLinkUseCase;
  let supabaseService: jest.Mocked<SupabaseService>;
  let userRepository: jest.Mocked<IUserRepository>;
  let sessionRepository: jest.Mocked<ISessionRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockSupabaseService = {
      verifyOtp: jest.fn(),
    };

    const mockUserRepository = {
      findBySupabaseUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockSessionRepository = {
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyMagicLinkUseCase,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: SESSION_REPOSITORY,
          useValue: mockSessionRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    useCase = module.get<VerifyMagicLinkUseCase>(VerifyMagicLinkUseCase);
    supabaseService = module.get(SupabaseService);
    userRepository = module.get(USER_REPOSITORY);
    sessionRepository = module.get(SESSION_REPOSITORY);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    const mockSupabaseUser = {
      id: 'supabase-user-123',
      email: 'test@example.com',
      user_metadata: { firstName: 'Test' },
    };

    const mockUser = UserEntity.create(
      mockSupabaseUser.email,
      mockSupabaseUser.id,
      'Test',
    );
    mockUser.id = 'user-123';

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_TOKEN_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_TOKEN_EXPIRATION') return '7d';
        return null;
      });
    });

    it('should verify magic link and create new user', async () => {
      const dto = {
        token_hash: 'valid-token',
        type: 'magiclink',
      };

      supabaseService.verifyOtp.mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      } as any);

      userRepository.findBySupabaseUserId.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValueOnce('access-token');
      jwtService.sign.mockReturnValueOnce('refresh-token');
      sessionRepository.create.mockResolvedValue({} as any);

      const result = await useCase.execute(dto);

      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(mockSupabaseUser.email);
      expect(userRepository.create).toHaveBeenCalled();
      expect(sessionRepository.create).toHaveBeenCalled();
    });

    it('should verify magic link for existing user', async () => {
      const dto = {
        token_hash: 'valid-token',
        type: 'magiclink',
      };

      supabaseService.verifyOtp.mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      } as any);

      userRepository.findBySupabaseUserId.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValueOnce('access-token');
      jwtService.sign.mockReturnValueOnce('refresh-token');
      sessionRepository.create.mockResolvedValue({} as any);

      const result = await useCase.execute(dto, '127.0.0.1', 'Test Agent');

      expect(result.success).toBe(true);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalled();
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        }),
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const dto = {
        token_hash: 'invalid-token',
        type: 'magiclink',
      };

      supabaseService.verifyOtp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      } as any);

      await expect(useCase.execute(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Supabase user is null', async () => {
      const dto = {
        token_hash: 'valid-token',
        type: 'magiclink',
      };

      supabaseService.verifyOtp.mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      await expect(useCase.execute(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
