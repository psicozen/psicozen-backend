import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure - Persistence
import { UserSchema } from './infrastructure/persistence/user.schema';

// Infrastructure - Repositories
import { UserRepository } from './infrastructure/repositories/user.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';

// Application - Use Cases
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  GetUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
} from './application/use-cases';

// Presentation - Controllers
import { UsersController } from './presentation/controllers/users.controller';

// External Modules
import { EmailsModule } from '../emails/emails.module';
import { RolesModule } from '../roles/roles.module';

// Core Services
import { AuditLogService } from '../../core/application/services/audit-log.service';
import { AUDIT_LOG_SERVICE } from '../../core/application/services/audit-log.service.interface';

// Emociograma Services (LGPD)
import { DataAnonymizationService } from '../emociograma/application/services/data-anonymization.service';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../emociograma/domain/repositories/submission.repository.interface';
import { EmociogramaSubmissionRepository } from '../emociograma/infrastructure/repositories/submission.repository';
import { EmociogramaSubmissionSchema } from '../emociograma/infrastructure/persistence/submission.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSchema, EmociogramaSubmissionSchema]),
    EmailsModule,
    forwardRef(() => RolesModule),
  ],
  controllers: [UsersController],
  providers: [
    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
      useClass: EmociogramaSubmissionRepository,
    },

    // Core Services
    {
      provide: AUDIT_LOG_SERVICE,
      useClass: AuditLogService,
    },

    // Use Cases
    CreateUserUseCase,
    UpdateUserUseCase,
    GetUserUseCase,
    DeleteUserUseCase,
    ListUsersUseCase,

    // LGPD Services
    DataAnonymizationService,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
