import { Repository, FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  IBaseRepository,
  FindOptions,
  PaginatedResult,
} from '../../domain/repositories/base.repository.interface';
import { NotFoundException } from '../../domain/exceptions';
import { getTransactionManager } from '../database/rls.storage';

/**
 * Interface para entidades que possuem um campo id
 */
interface EntityWithId {
  id: string;
}

export abstract class TypeOrmBaseRepository<
  TEntity extends EntityWithId,
  TDomain,
> implements IBaseRepository<TDomain>
{
  constructor(protected readonly repository: Repository<TEntity>) {}

  abstract toDomain(entity: TEntity): TDomain;
  abstract toEntity(domain: Partial<TDomain>): TEntity;

  async findById(id: string): Promise<TDomain | null> {
    const manager = getTransactionManager();
    const repo = manager ? manager.getRepository<TEntity>(this.repository.target) : this.repository;
    
    const entity = await repo.findOne({
      where: { id } as FindOptionsWhere<TEntity>,
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: FindOptions): Promise<PaginatedResult<TDomain>> {
    const manager = getTransactionManager();
    const repo = manager ? manager.getRepository<TEntity>(this.repository.target) : this.repository;

    const page = options?.skip
      ? Math.floor(options.skip / (options.take || 10)) + 1
      : 1;
    const limit = options?.take || 10;

    const [entities, total] = await repo.findAndCount({
      skip: options?.skip,
      take: options?.take,
      order: options?.orderBy as FindOptionsOrder<TEntity>,
      where: options?.where,
    });

    return {
      data: entities.map((entity) => this.toDomain(entity)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(domain: Partial<TDomain>): Promise<TDomain> {
    const manager = getTransactionManager();
    const repo = manager ? manager.getRepository<TEntity>(this.repository.target) : this.repository;

    const entity = this.toEntity(domain);
    const saved = await repo.save(entity);
    return this.toDomain(saved);
  }

  async update(id: string, partial: Partial<TDomain>): Promise<TDomain> {
    const manager = getTransactionManager();
    const repo = manager ? manager.getRepository<TEntity>(this.repository.target) : this.repository;

    await repo.update(
      id,
      this.toEntity(partial) as QueryDeepPartialEntity<TEntity>,
    );
    const updated = await repo.findOne({
      where: { id } as FindOptionsWhere<TEntity>,
    });

    if (!updated) {
      throw new NotFoundException('Entity', id);
    }

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    const manager = getTransactionManager();
    const repo = manager ? manager.getRepository<TEntity>(this.repository.target) : this.repository;
    await repo.delete(id);
  }

  async softDelete(id: string): Promise<void> {
    const manager = getTransactionManager();
    const repo = manager ? manager.getRepository<TEntity>(this.repository.target) : this.repository;
    await repo.softDelete(id);
  }
}
