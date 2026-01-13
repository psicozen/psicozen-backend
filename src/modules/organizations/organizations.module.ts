import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure - Persistence
import { OrganizationSchema } from './infrastructure/persistence/organization.schema';

// Infrastructure - Repositories
import { OrganizationRepository } from './infrastructure/repositories/organization.repository';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository.interface';

// Application - Use Cases
import {
  CreateOrganizationUseCase,
  GetOrganizationUseCase,
  ListOrganizationsUseCase,
  UpdateOrganizationSettingsUseCase,
  DeleteOrganizationUseCase,
} from './application/use-cases';

// Presentation - Controllers
import { OrganizationsController } from './presentation/controllers/organizations.controller';

// Guards - requires UsersModule for USER_REPOSITORY
import { RolesGuard } from '../../core/presentation/guards/roles.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationSchema]), UsersModule],
  controllers: [OrganizationsController],
  providers: [
    // Repositories
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },

    // Use Cases
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
    ListOrganizationsUseCase,
    UpdateOrganizationSettingsUseCase,
    DeleteOrganizationUseCase,

    // Guards
    RolesGuard,
  ],
  exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationsModule {}
