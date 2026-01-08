import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Infrastructure - Persistence
import { SessionSchema } from './infrastructure/persistence/session.schema';

// Infrastructure - Repositories
import { SessionRepository } from './infrastructure/repositories/session.repository';
import { SESSION_REPOSITORY } from './domain/repositories/session.repository.interface';

// Infrastructure - Strategies
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

// Presentation - Guards
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

// Presentation - Controllers
import { AuthController } from './presentation/controllers/auth.controller';

// Application - Use Cases
import { SendMagicLinkUseCase } from './application/use-cases/send-magic-link.use-case';
import { VerifyMagicLinkUseCase } from './application/use-cases/verify-magic-link.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';

// Core
import { SupabaseModule } from '../../core/infrastructure/supabase/supabase.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION') || '15m';
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([SessionSchema]),
    SupabaseModule,
  ],
  controllers: [AuthController],
  providers: [
    // Strategies
    JwtStrategy,

    // Guards
    JwtAuthGuard,

    // Repositories
    {
      provide: SESSION_REPOSITORY,
      useClass: SessionRepository,
    },

    // Use Cases
    SendMagicLinkUseCase,
    VerifyMagicLinkUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
  ],
  exports: [
    JwtAuthGuard,
    SESSION_REPOSITORY,
    JwtModule,
  ],
})
export class AuthModule {}
