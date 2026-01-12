import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { OrganizationSchema } from '../persistence/organization.schema';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import type { OrganizationType } from '../../domain/types/organization-settings.types';

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
      settings: schema.settings,
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
    schema.parentId = domain.parentId;
    schema.isActive = domain.isActive ?? true;
    return schema;
  }

  async findBySlug(slug: string): Promise<OrganizationEntity | null> {
    const schema = await this.repository.findOne({
      where: { slug },
    });
    return schema ? this.toDomain(schema) : null;
  }

  async findChildren(parentId: string): Promise<OrganizationEntity[]> {
    const schemas = await this.repository.find({
      where: { parentId, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
    return schemas.map((schema) => this.toDomain(schema));
  }

  async findActiveByType(
    type: OrganizationType,
  ): Promise<OrganizationEntity[]> {
    const schemas = await this.repository.find({
      where: { type, isActive: true, deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
    return schemas.map((schema) => this.toDomain(schema));
  }
}
