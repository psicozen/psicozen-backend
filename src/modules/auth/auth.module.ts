import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

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
  imports: [ConfigModule, SupabaseModule, UsersModule],
  controllers: [AuthController],
  providers: [
    // Guards
    SupabaseAuthGuard,

    // Use Cases
    SendMagicLinkUseCase,
    LogoutUseCase,
  ],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
