import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Domain - Interfaces
import { AUTH_SERVICE } from './domain/services/auth.service.interface';

// Infrastructure - Services
import { SupabaseAuthService } from './infrastructure/services/supabase-auth.service';

// Presentation - Guards
import { SupabaseAuthGuard } from './presentation/guards/supabase-auth.guard';

// Presentation - Controllers
import { AuthController } from './presentation/controllers/auth.controller';

// Application - Use Cases
import { SendMagicLinkUseCase } from './application/use-cases/send-magic-link.use-case';
import { SyncUserWithSupabaseUseCase } from './application/use-cases/sync-user-with-supabase.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';

// Core
import { SupabaseModule } from '../../core/infrastructure/supabase/supabase.module';

// Modules
import { UsersModule } from '../users/users.module';

@Global() // Make this module globally available
@Module({
  imports: [ConfigModule, SupabaseModule, UsersModule],
  controllers: [AuthController],
  providers: [
    // Infrastructure - Auth Service Implementation
    {
      provide: AUTH_SERVICE,
      useClass: SupabaseAuthService,
    },

    // Guards
    SupabaseAuthGuard,

    // Use Cases
    SendMagicLinkUseCase,
    SyncUserWithSupabaseUseCase,
    LogoutUseCase,
  ],
  exports: [SupabaseAuthGuard, AUTH_SERVICE, SyncUserWithSupabaseUseCase],
})
export class AuthModule {}
