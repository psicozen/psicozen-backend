import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

// Configuration
import { validationSchema } from './config/env.validation';
import { getDatabaseConfig } from './config/database.config';

// Core
import { SupabaseModule } from './core/infrastructure/supabase/supabase.module';
import { AllExceptionsFilter } from './core/presentation/filters/http-exception.filter';
import { JwtAuthGuard } from './modules/auth/presentation/guards/jwt-auth.guard';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { FilesModule } from './modules/files/files.module';
import { EmailsModule } from './modules/emails/emails.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

// Core - Middleware
import { OrganizationContextMiddleware } from './core/presentation/middleware/organization-context.middleware';
import { RlsMiddleware } from './core/presentation/middlewares/rls.middleware';

// Legacy (to be removed)
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests
      },
    ]),

    // Core Modules
    SupabaseModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    RolesModule,
    FilesModule,
    EmailsModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global JWT Guard (can be overridden with @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RlsMiddleware, OrganizationContextMiddleware)
      .forRoutes('*');
  }
}
