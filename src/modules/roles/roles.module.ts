import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure - Persistence
import { RoleSchema } from './infrastructure/persistence/role.schema';
import { PermissionSchema } from './infrastructure/persistence/permission.schema';
import { UserRoleSchema } from './infrastructure/persistence/user-role.schema';

// Infrastructure - Repositories
import { RoleRepository } from './infrastructure/repositories/role.repository';
import { ROLE_REPOSITORY } from './domain/repositories/role.repository.interface';

// Application - Use Cases
import { AssignRoleToUserUseCase } from './application/use-cases/assign-role-to-user.use-case';

// External Module Dependencies
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleSchema, PermissionSchema, UserRoleSchema]),
    UsersModule, // Provides USER_REPOSITORY
    OrganizationsModule, // Provides ORGANIZATION_REPOSITORY
  ],
  controllers: [],
  providers: [
    // Repositories
    {
      provide: ROLE_REPOSITORY,
      useClass: RoleRepository,
    },

    // Use Cases
    AssignRoleToUserUseCase,
  ],
  exports: [
    ROLE_REPOSITORY, // Export for other modules (e.g., AuthModule, UsersModule)
  ],
})
export class RolesModule {}
