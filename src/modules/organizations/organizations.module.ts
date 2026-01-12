import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure - Persistence
import { OrganizationSchema } from './infrastructure/persistence/organization.schema';

// Infrastructure - Repositories
import { OrganizationRepository } from './infrastructure/repositories/organization.repository';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationSchema])],
  providers: [
    // Repositories
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },
  ],
  exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationsModule {}
