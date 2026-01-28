import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLogSchema } from '../persistence/audit-log.schema';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import type {
  IAuditLogRepository,
  AuditLogQueryOptions,
  AuditLogPaginatedResult,
} from '../../domain/repositories/audit-log.repository.interface';

/**
 * Implementação do Repositório de Logs de Auditoria
 *
 * Utiliza TypeORM para persistência no PostgreSQL.
 * Implementa a interface IAuditLogRepository da camada Domain.
 */
@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  /** Limite padrão para consultas */
  private readonly DEFAULT_LIMIT = 100;

  constructor(
    @InjectRepository(AuditLogSchema)
    private readonly repository: Repository<AuditLogSchema>,
  ) {}

  /**
   * Criar uma nova entrada de log de auditoria
   */
  async create(entity: AuditLogEntity): Promise<AuditLogEntity> {
    const schema = this.toSchema(entity);
    const saved = await this.repository.save(schema);
    return this.toDomain(saved);
  }

  /**
   * Buscar logs por usuário
   */
  async findByUser(
    userId: string,
    organizationId?: string,
    options?: AuditLogQueryOptions,
  ): Promise<AuditLogPaginatedResult> {
    const queryBuilder = this.repository
      .createQueryBuilder('audit_logs')
      .where('audit_logs.user_id = :userId', { userId });

    if (organizationId) {
      queryBuilder.andWhere('audit_logs.organization_id = :organizationId', {
        organizationId,
      });
    }

    this.applyFilters(queryBuilder, options);

    queryBuilder
      .orderBy('audit_logs.created_at', 'DESC')
      .take(options?.limit ?? this.DEFAULT_LIMIT)
      .skip(options?.offset ?? 0);

    const [schemas, total] = await queryBuilder.getManyAndCount();

    return {
      data: schemas.map((s) => this.toDomain(s)),
      total,
    };
  }

  /**
   * Buscar logs por ação
   */
  async findByAction(
    action: string,
    organizationId?: string,
    options?: AuditLogQueryOptions,
  ): Promise<AuditLogPaginatedResult> {
    const queryBuilder = this.repository
      .createQueryBuilder('audit_logs')
      .where('audit_logs.action = :action', { action });

    if (organizationId) {
      queryBuilder.andWhere('audit_logs.organization_id = :organizationId', {
        organizationId,
      });
    }

    this.applyFilters(queryBuilder, options);

    queryBuilder
      .orderBy('audit_logs.created_at', 'DESC')
      .take(options?.limit ?? this.DEFAULT_LIMIT)
      .skip(options?.offset ?? 0);

    const [schemas, total] = await queryBuilder.getManyAndCount();

    return {
      data: schemas.map((s) => this.toDomain(s)),
      total,
    };
  }

  /**
   * Deletar logs antigos (política de retenção)
   */
  async deleteOlderThan(olderThan: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(AuditLogSchema)
      .where('created_at < :olderThan', { olderThan })
      .execute();

    return result.affected ?? 0;
  }

  /**
   * Aplicar filtros opcionais ao query builder
   */
  private applyFilters(
    queryBuilder: ReturnType<typeof this.repository.createQueryBuilder>,
    options?: AuditLogQueryOptions,
  ): void {
    if (options?.action) {
      queryBuilder.andWhere('audit_logs.action = :filterAction', {
        filterAction: options.action,
      });
    }

    if (options?.startDate && options?.endDate) {
      queryBuilder.andWhere(
        'audit_logs.created_at BETWEEN :startDate AND :endDate',
        {
          startDate: options.startDate,
          endDate: options.endDate,
        },
      );
    } else if (options?.startDate) {
      queryBuilder.andWhere('audit_logs.created_at >= :startDate', {
        startDate: options.startDate,
      });
    } else if (options?.endDate) {
      queryBuilder.andWhere('audit_logs.created_at <= :endDate', {
        endDate: options.endDate,
      });
    }
  }

  /**
   * Converte entidade de domínio para schema do banco
   */
  private toSchema(entity: AuditLogEntity): AuditLogSchema {
    const schema = new AuditLogSchema();
    schema.action = entity.action;
    schema.userId = entity.userId;
    schema.organizationId = entity.organizationId ?? null;
    schema.performedBy = entity.performedBy ?? null;
    schema.metadata = entity.metadata || {};
    schema.ipAddress = entity.ipAddress ?? null;
    schema.userAgent = entity.userAgent ?? null;
    schema.createdAt = entity.createdAt || new Date();
    return schema;
  }

  /**
   * Converte schema do banco para entidade de domínio
   */
  private toDomain(schema: AuditLogSchema): AuditLogEntity {
    return new AuditLogEntity({
      id: schema.id,
      action: schema.action,
      userId: schema.userId,
      organizationId: schema.organizationId ?? undefined,
      performedBy: schema.performedBy ?? undefined,
      metadata: schema.metadata,
      ipAddress: schema.ipAddress ?? undefined,
      userAgent: schema.userAgent ?? undefined,
      createdAt: schema.createdAt,
    });
  }
}
