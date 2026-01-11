import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleSchema } from './infrastructure/persistence/role.schema';
import { PermissionSchema } from './infrastructure/persistence/permission.schema';
import { UserRoleSchema } from './infrastructure/persistence/user-role.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleSchema, PermissionSchema, UserRoleSchema]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class RolesModule {}
