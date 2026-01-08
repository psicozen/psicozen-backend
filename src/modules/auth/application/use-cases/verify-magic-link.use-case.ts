import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import type { ISessionRepository } from '../../domain/repositories/session.repository.interface';
import { SESSION_REPOSITORY } from '../../domain/repositories/session.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { SessionEntity } from '../../domain/entities/session.entity';
import { VerifyMagicLinkDto } from '../dtos/verify-magic-link.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';

@Injectable()
export class VerifyMagicLinkUseCase {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    dto: VerifyMagicLinkDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    try {
      // 1. Verificar OTP com Supabase
      const { data, error } = await this.supabaseService.verifyOtp({
        token_hash: dto.token_hash,
        type: dto.type as 'magiclink' | 'recovery' | 'invite' | 'email_change',
      });

      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired magic link');
      }

      // 2. Buscar ou criar usuário no banco local
      let user = await this.userRepository.findBySupabaseUserId(data.user.id);

      if (!user) {
        user = await this.userRepository.create(
          UserEntity.create(
            data.user.email!,
            data.user.id,
            data.user.user_metadata?.firstName,
          ),
        );
      } else {
        user.recordLogin();
        await this.userRepository.update(user.id, user);
      }

      // 3. Gerar JWT tokens próprios
      const payload = {
        sub: user.id,
        email: user.email,
        supabaseUserId: user.supabaseUserId,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION'),
      });

      // 4. Salvar sessão no banco
      const expiresIn = this.parseExpiration(
        this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION', '7d'),
      );

      const session = SessionEntity.create(
        user.id,
        refreshToken,
        expiresIn,
        ipAddress,
        userAgent,
      );

      await this.sessionRepository.create(session);

      // 5. Retornar resposta
      return {
        success: true,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: this.parseExpiration(
            this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION', '15m'),
          ),
          tokenType: 'Bearer',
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to verify magic link');
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
        return 900; // 15 minutos padrão
    }
  }
}
