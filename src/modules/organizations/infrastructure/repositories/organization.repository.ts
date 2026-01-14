import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { OrganizationSchema } from '../persistence/organization.schema';
import { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import {
  OrganizationType,
  DEFAULT_ORGANIZATION_SETTINGS,
} from '../../domain/types/organization-settings.types';
import { getTransactionManager } from '../../../../core/infrastructure/database/rls.storage';

@Injectable()
export class OrganizationRepository
  extends TypeOrmBaseRepository<OrganizationSchema, OrganizationEntity>
  implements IOrganizationRepository
{
  constructor(
    @InjectRepository(OrganizationSchema)
    repository: Repository<OrganizationSchema>,
  ) {
    super(repository);
  }

  toDomain(schema: OrganizationSchema): OrganizationEntity {
    return new OrganizationEntity({
      id: schema.id,
      name: schema.name,
      slug: schema.slug,
      type: schema.type,
      settings: { ...DEFAULT_ORGANIZATION_SETTINGS, ...schema.settings },
      parentId: schema.parentId,
      isActive: schema.isActive,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      deletedAt: schema.deletedAt,
    });
  }

  toEntity(domain: Partial<OrganizationEntity>): OrganizationSchema {
    const schema = new OrganizationSchema();
    if (domain.id) schema.id = domain.id;
    if (domain.name) schema.name = domain.name;
    if (domain.slug) schema.slug = domain.slug;
    if (domain.type) schema.type = domain.type;
    if (domain.settings) schema.settings = domain.settings;
    if (domain.parentId !== undefined) schema.parentId = domain.parentId;
    if (domain.isActive !== undefined) schema.isActive = domain.isActive;
    if (domain.updatedAt) schema.updatedAt = domain.updatedAt;
    return schema;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const schema = await this.repository.findOne({
      where: { slug, deletedAt: IsNull() },
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findChildren(parentId: string): Promise<OrganizationEntity[]> {
    const manager = getTransactionManager();
    const repo = manager
      ? manager.getRepository<OrganizationSchema>(this.repository.target)
      : this.repository;

    const schemas = await repo.find({
      where: { parentId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    return schemas.map((schema) => this.toDomain(schema));
  }

  async findActiveByType(
    type: OrganizationType,
  ): Promise<OrganizationEntity[]> {
    const manager = getTransactionManager();
    const repo = manager
      ? manager.getRepository<OrganizationSchema>(this.repository.target)
      : this.repository;

    const schemas = await repo.find({
      where: {
        type,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { name: 'ASC' },
    });
    return schemas.map((schema) => this.toDomain(schema));
  }
}
