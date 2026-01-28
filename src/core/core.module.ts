import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Persistence
import { AuditLogSchema } from './infrastructure/persistence/audit-log.schema';

// Repositories
import { AuditLogRepository } from './infrastructure/repositories/audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository.interface';

// Services
import { AuditLogService } from './application/services/audit-log.service';
import { AUDIT_LOG_SERVICE } from './application/services/audit-log.service.interface';

/**
 * Core Module
 *
 * Provides core infrastructure services following Clean Architecture:
 * - AuditLogService: Audit logging for LGPD compliance
 */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogSchema])],
  providers: [
    // Repository
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogRepository,
    },
    // Service
    {
      provide: AUDIT_LOG_SERVICE,
      useClass: AuditLogService,
    },
  ],
  exports: [AUDIT_LOG_SERVICE, AUDIT_LOG_REPOSITORY],
})
export class CoreModule {}
