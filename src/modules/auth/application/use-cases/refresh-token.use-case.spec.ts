import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { ISessionRepository, SESSION_REPOSITORY } from '../../domain/repositories/session.repository.interface';
import { SessionEntity } from '../../domain/entities/session.entity';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let sessionRepository: jest.Mocked<ISessionRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockSessionRepository = {
      findByToken: jest.fn(),
      revokeByToken: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_TOKEN_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_TOKEN_EXPIRATION') return '7d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
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

    useCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
    sessionRepository = module.get(SESSION_REPOSITORY);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should refresh token successfully', async () => {
      const dto = { refreshToken: 'valid-refresh-token' };

      const mockSession = SessionEntity.create(
        'user-123',
        dto.refreshToken,
        604800,
      );
      mockSession.isValid = true;

      sessionRepository.findByToken.mockResolvedValue(mockSession);
      jwtService.verify.mockReturnValue({
        sub: 'user-123',
        email: 'test@example.com',
        supabaseUserId: 'supabase-123',
      });
      jwtService.sign.mockReturnValueOnce('new-access-token');
      jwtService.sign.mockReturnValueOnce('new-refresh-token');

      const result = await useCase.execute(dto);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(sessionRepository.revokeByToken).toHaveBeenCalledWith(
        dto.refreshToken,
      );
      expect(sessionRepository.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const dto = { refreshToken: 'invalid-token' };

      sessionRepository.findByToken.mockResolvedValue(null);

      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const dto = { refreshToken: 'expired-token' };

      const expiredSession = SessionEntity.create('user-123', dto.refreshToken, -100);
      expiredSession.isValid = true;

      sessionRepository.findByToken.mockResolvedValue(expiredSession);

      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const dto = { refreshToken: 'revoked-token' };

      const revokedSession = SessionEntity.create('user-123', dto.refreshToken, 604800);
      revokedSession.isValid = false;

      sessionRepository.findByToken.mockResolvedValue(revokedSession);

      await expect(useCase.execute(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
