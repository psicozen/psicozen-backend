import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IS_PUBLIC_KEY } from '../../../../core/presentation/decorators/public.decorator';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { UserEntity } from '../../../users/domain/entities/user.entity';

@Injectable()
export class SupabaseAuthGuard {
  private readonly supabase: SupabaseClient;

  constructor(
    private reflector: Reflector,
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_PUBLISHABLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and PUBLISHABLE_KEY must be defined');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // Validate token with Supabase Auth server
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const supabaseUser = data.user;

      // Find or create user in local database
      let user = await this.userRepository.findBySupabaseUserId(
        supabaseUser.id,
      );

      if (!user) {
        // Auto-create user on first authenticated request
        user = await this.userRepository.create(
          UserEntity.create(
            supabaseUser.email!,
            supabaseUser.id,
            supabaseUser.user_metadata?.first_name ||
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

      // Attach user to request for @CurrentUser decorator
      request.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        supabaseUserId: user.supabaseUserId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
