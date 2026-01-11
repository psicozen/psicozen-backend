import { Test, TestingModule } from '@nestjs/testing';
import { LogoutUseCase } from './logout.use-case';
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from '../../domain/repositories/session.repository.interface';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let sessionRepository: jest.Mocked<ISessionRepository>;

  beforeEach(async () => {
    const mockSessionRepository = {
      revokeByToken: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        {
          provide: SESSION_REPOSITORY,
          useValue: mockSessionRepository,
        },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
    sessionRepository = module.get(SESSION_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should revoke specific session when refresh token provided', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-abc';

      const result = await useCase.execute(userId, refreshToken);

      expect(result.message).toBe('Session revoked successfully');
      expect(sessionRepository.revokeByToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(sessionRepository.revokeAllByUserId).not.toHaveBeenCalled();
    });

    it('should revoke all user sessions when no refresh token provided', async () => {
      const userId = 'user-123';

      const result = await useCase.execute(userId);

      expect(result.message).toBe('All sessions revoked successfully');
      expect(sessionRepository.revokeAllByUserId).toHaveBeenCalledWith(userId);
      expect(sessionRepository.revokeByToken).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const userId = 'user-123';

      sessionRepository.revokeAllByUserId.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(useCase.execute(userId)).rejects.toThrow();
    });
  });
});
