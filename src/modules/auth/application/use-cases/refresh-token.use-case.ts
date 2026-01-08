import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { ISessionRepository } from '../../domain/repositories/session.repository.interface';
import { SESSION_REPOSITORY } from '../../domain/repositories/session.repository.interface';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import type { JwtPayload } from '../../infrastructure/strategies/jwt.strategy';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      // 1. Buscar sessão pelo refresh token
      const session = await this.sessionRepository.findByToken(dto.refreshToken);

      if (!session || !session.isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.isExpired()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // 2. Verificar JWT
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify(dto.refreshToken) as JwtPayload;
      } catch {
        throw new UnauthorizedException('Invalid token signature');
      }

      // 3. Gerar novo access token
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        supabaseUserId: payload.supabaseUserId,
      };

      const accessToken = this.jwtService.sign(newPayload);

      // 4. Rotacionar refresh token (security best practice)
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION'),
      });

      // 5. Invalidar token antigo e criar novo
      await this.sessionRepository.revokeByToken(dto.refreshToken);

      const expiresIn = this.parseExpiration(
        this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
      );

      session.refreshToken = newRefreshToken;
      session.isValid = true;
      session.expiresAt = new Date(Date.now() + expiresIn * 1000);
      session.updatedAt = new Date();

      await this.sessionRepository.create(session);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.parseExpiration(
          this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
        ),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
