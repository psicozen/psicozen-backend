import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { EmociogramaCategorySchema } from '../persistence/category.schema';
import { EmociogramaCategoryEntity } from '../../domain/entities/category.entity';
import type { IEmociogramaCategoryRepository } from '../../domain/repositories/category.repository.interface';

/**
 * Implementação do Repositório de Categorias do Emociograma
 *
 * Estende TypeOrmBaseRepository para operações CRUD básicas e implementa
 * métodos especializados para consultas de categorias.
 */
@Injectable()
export class EmociogramaCategoryRepository
  extends TypeOrmBaseRepository<
    EmociogramaCategorySchema,
    EmociogramaCategoryEntity
  >
  implements IEmociogramaCategoryRepository
{
  constructor(
    @InjectRepository(EmociogramaCategorySchema)
    repository: Repository<EmociogramaCategorySchema>,
  ) {
    super(repository);
  }

  /**
   * Converte um schema do banco de dados para entidade de domínio
   */
  toDomain(schema: EmociogramaCategorySchema): EmociogramaCategoryEntity {
    return new EmociogramaCategoryEntity({
      id: schema.id,
      name: schema.name,
      slug: schema.slug,
      description: schema.description ?? undefined,
      icon: schema.icon ?? undefined,
      displayOrder: schema.displayOrder,
      isActive: schema.isActive,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    });
  }

  /**
   * Converte uma entidade de domínio para schema do banco de dados
   */
  toEntity(
    domain: Partial<EmociogramaCategoryEntity>,
  ): EmociogramaCategorySchema {
    const schema = new EmociogramaCategorySchema();

    if (domain.id !== undefined) schema.id = domain.id;
    if (domain.name !== undefined) schema.name = domain.name;
    if (domain.slug !== undefined) schema.slug = domain.slug;
    if (domain.description !== undefined)
      schema.description = domain.description ?? null;
    if (domain.icon !== undefined) schema.icon = domain.icon ?? null;
    if (domain.displayOrder !== undefined)
      schema.displayOrder = domain.displayOrder;
    if (domain.isActive !== undefined) schema.isActive = domain.isActive;
    if (domain.createdAt !== undefined) schema.createdAt = domain.createdAt;
    if (domain.updatedAt !== undefined) schema.updatedAt = domain.updatedAt;

    return schema;
  }

  /**
   * Encontrar todas as categorias ativas ordenadas por displayOrder
   */
  async findAllActive(): Promise<EmociogramaCategoryEntity[]> {
    const schemas = await this.repository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });

    return schemas.map((schema) => this.toDomain(schema));
  }

  /**
   * Encontrar categoria pelo slug
   */
  async findBySlug(slug: string): Promise<EmociogramaCategoryEntity | null> {
    const schema = await this.repository.findOne({
      where: { slug },
    });

    return schema ? this.toDomain(schema) : null;
  }

  /**
   * Verificar se existe uma categoria com o mesmo nome
   */
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const slug = EmociogramaCategoryEntity.generateSlug(name);

    const whereClause: Record<string, unknown> = { slug };
    if (excludeId) {
      whereClause.id = Not(excludeId);
    }

    const count = await this.repository.count({ where: whereClause });
    return count > 0;
  }
}
