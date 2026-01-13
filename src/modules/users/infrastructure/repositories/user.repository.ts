import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserSchema } from '../persistence/user.schema';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { Role } from '../../../roles/domain/enums/role.enum';

@Injectable()
export class UserRepository
  extends TypeOrmBaseRepository<UserSchema, UserEntity>
  implements IUserRepository
{
  constructor(
    @InjectRepository(UserSchema)
    repository: Repository<UserSchema>,
  ) {
    super(repository);
  }

  toDomain(schema: UserSchema): UserEntity {
    return new UserEntity({
      id: schema.id,
      email: schema.email,
      firstName: schema.firstName,
      lastName: schema.lastName,
      photoUrl: schema.photoUrl,
      bio: schema.bio,
      preferences: schema.preferences,
      supabaseUserId: schema.supabaseUserId,
      isActive: schema.isActive,
      lastLoginAt: schema.lastLoginAt,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      deletedAt: schema.deletedAt,
    });
  }

  toEntity(domain: Partial<UserEntity>): UserSchema {
    const schema = new UserSchema();
    if (domain.id) schema.id = domain.id;
    schema.email = domain.email!;
    schema.firstName = domain.firstName;
    schema.lastName = domain.lastName;
    schema.photoUrl = domain.photoUrl;
    schema.bio = domain.bio;
    schema.preferences = domain.preferences!;
    schema.supabaseUserId = domain.supabaseUserId;
    schema.isActive = domain.isActive ?? true;
    schema.lastLoginAt = domain.lastLoginAt;
    return schema;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const schema = await this.repository.findOne({
      where: { email },
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findBySupabaseUserId(
    supabaseUserId: string,
  ): Promise<UserEntity | null> {
    const schema = await this.repository.findOne({
      where: { supabaseUserId },
    });
    return schema ? this.toDomain(schema) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { email },
    });
    return count > 0;
  }

  async getRolesByOrganization(
    userId: string,
    organizationId?: string,
  ): Promise<Role[]> {
    const queryBuilder = this.repository.manager
      .createQueryBuilder()
      .select('DISTINCT r.name', 'name')
      .from('user_roles', 'ur')
      .innerJoin('roles', 'r', 'ur.role_id = r.id')
      .where('ur.user_id = :userId', { userId });

    if (organizationId) {
      // If organization ID is provided, get roles for that org plus global roles
      queryBuilder.andWhere(
        '(ur.organization_id = :organizationId OR ur.organization_id IS NULL)',
        { organizationId },
      );
    } else {
      // If no organization ID, only return global roles (organization_id IS NULL)
      queryBuilder.andWhere('ur.organization_id IS NULL');
    }

    const results = await queryBuilder.getRawMany<{ name: string }>();
    return results.map((r) => r.name as Role);
  }
}
