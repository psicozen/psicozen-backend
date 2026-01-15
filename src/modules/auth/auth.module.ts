import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';

// Infrastructure - Strategies
import { SupabaseAuthStrategy } from './infrastructure/strategies/supabase-auth.strategy';

// Presentation - Guards
import { SupabaseAuthGuard } from './presentation/guards/supabase-auth.guard';

// Presentation - Controllers
import { AuthController } from './presentation/controllers/auth.controller';

// Application - Use Cases
import { SendMagicLinkUseCase } from './application/use-cases/send-magic-link.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';

// Core
import { SupabaseModule } from '../../core/infrastructure/supabase/supabase.module';

// Modules
import { UsersModule } from '../users/users.module';

@Global() // Make this module globally available
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase' }),
    ConfigModule,
    SupabaseModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    // Strategies
    SupabaseAuthStrategy,

    // Guards
    SupabaseAuthGuard,

    // Global Auth Guard - registered here to ensure Passport strategy is initialized first
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },

    // Use Cases
    SendMagicLinkUseCase,
    LogoutUseCase,
  ],
  exports: [
    PassportModule,
    SupabaseAuthGuard,
    SupabaseAuthStrategy, // Export strategy for global guard usage
  ],
})
export class AuthModule {}
