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

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationSchema])],
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
  ],
  exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationsModule {}
