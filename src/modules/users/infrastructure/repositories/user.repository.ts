import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserSchema } from '../persistence/user.schema';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

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
}
