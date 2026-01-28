import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure - Persistence (Schemas)
import { EmociogramaSubmissionSchema } from './infrastructure/persistence/submission.schema';
import { EmociogramaAlertSchema } from './infrastructure/persistence/alert.schema';
import { EmociogramaCategorySchema } from './infrastructure/persistence/category.schema';

// Infrastructure - Repositories
import { EmociogramaSubmissionRepository } from './infrastructure/repositories/submission.repository';
import { EmociogramaAlertRepository } from './infrastructure/repositories/alert.repository';
import {
  EMOCIOGRAMA_SUBMISSION_REPOSITORY,
  EMOCIOGRAMA_ALERT_REPOSITORY,
} from './domain/repositories';

// Application - Services
import { AlertService, ALERT_SERVICE } from './application/services';

// Application - Use Cases
import {
  // Submission Use Cases
  SubmitEmociogramaUseCase,
  GetMySubmissionsUseCase,
  GetSubmissionByIdUseCase,
  GetTeamSubmissionsUseCase,
  // Report Use Cases
  GetAggregatedReportUseCase,
  GetAnalyticsUseCase,
  // Alert Use Cases
  GetAlertDashboardUseCase,
  ResolveAlertUseCase,
  ListAlertsUseCase,
  GetAlertByIdUseCase,
} from './application/use-cases';

// Presentation - Controllers
import { EmociogramaController } from './presentation/controllers/emociograma.controller';
import { AlertsController } from './presentation/controllers/alerts.controller';

// External Modules
import { UsersModule } from '../users/users.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmociogramaSubmissionSchema,
      EmociogramaAlertSchema,
      EmociogramaCategorySchema,
    ]),
    UsersModule,
    EmailsModule,
  ],
  controllers: [EmociogramaController, AlertsController],
  providers: [
    // Repositories
    {
      provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
      useClass: EmociogramaSubmissionRepository,
    },
    {
      provide: EMOCIOGRAMA_ALERT_REPOSITORY,
      useClass: EmociogramaAlertRepository,
    },

    // Services
    {
      provide: ALERT_SERVICE,
      useClass: AlertService,
    },

    // Submission Use Cases
    SubmitEmociogramaUseCase,
    GetMySubmissionsUseCase,
    GetSubmissionByIdUseCase,
    GetTeamSubmissionsUseCase,

    // Report Use Cases
    GetAggregatedReportUseCase,
    GetAnalyticsUseCase,

    // Alert Use Cases
    GetAlertDashboardUseCase,
    ResolveAlertUseCase,
    ListAlertsUseCase,
    GetAlertByIdUseCase,
  ],
  exports: [
    EMOCIOGRAMA_SUBMISSION_REPOSITORY,
    EMOCIOGRAMA_ALERT_REPOSITORY,
    ALERT_SERVICE,
  ],
})
export class EmociogramaModule {}
