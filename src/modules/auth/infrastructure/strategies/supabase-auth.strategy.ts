import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../../core/infrastructure/supabase/supabase.service';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';

export interface SupabaseJwtPayload {
  sub: string; // Supabase user ID
  email: string;
  role?: string;
  aud: string;
  exp: number;
  iat: number;
}

@Injectable()
export class SupabaseAuthStrategy extends PassportStrategy(
  Strategy,
  'supabase',
) {
  constructor(
    configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
      algorithms: ['HS256'], // Supabase uses HMAC-SHA256
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    // 1. Verify token is still valid in Supabase (prevents use of revoked tokens)
    const { data, error } = await this.supabaseService.getUser();

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }

    const supabaseUser = data.user;

    // 2. Find or create user in local database
    let user = await this.userRepository.findBySupabaseUserId(supabaseUser.id);

    if (!user) {
      // Auto-create user on first authenticated request
      user = await this.userRepository.create(
        UserEntity.create(
          supabaseUser.email!,
          supabaseUser.id,
          supabaseUser.user_metadata?.firstName,
        ),
      );
    } else {
      // Update last login
      user.recordLogin();
      await this.userRepository.update(user.id, user);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    // 3. Return user payload for @CurrentUser decorator
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      supabaseUserId: user.supabaseUserId,
    };
  }
}
