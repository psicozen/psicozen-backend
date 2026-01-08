import { Injectable, Inject } from '@nestjs/common';
import type { ISessionRepository } from '../../domain/repositories/session.repository.interface';
import { SESSION_REPOSITORY } from '../../domain/repositories/session.repository.interface';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
  ) {}

  async execute(
    userId: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    if (refreshToken) {
      // Logout de sessão específica
      await this.sessionRepository.revokeByToken(refreshToken);
      return { message: 'Session revoked successfully' };
    } else {
      // Logout de todas as sessões do usuário
      await this.sessionRepository.revokeAllByUserId(userId);
      return { message: 'All sessions revoked successfully' };
    }
  }
}
