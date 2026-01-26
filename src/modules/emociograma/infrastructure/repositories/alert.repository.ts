import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { EmociogramaAlertSchema } from '../persistence/alert.schema';
import {
  EmociogramaAlertEntity,
  AlertSeverity,
  AlertType,
} from '../../domain/entities/alert.entity';
import type {
  IEmociogramaAlertRepository,
  AlertStatistics,
  AlertFindOptions,
  AlertPaginatedResult,
} from '../../domain/repositories/alert.repository.interface';

/**
 * Implementação do Repositório de Alertas do Emociograma
 *
 * Estende TypeOrmBaseRepository para operações CRUD básicas e implementa
 * métodos especializados para consultas de alertas, estatísticas e
 * resolução em lote.
 */
@Injectable()
export class EmociogramaAlertRepository
  extends TypeOrmBaseRepository<EmociogramaAlertSchema, EmociogramaAlertEntity>
  implements IEmociogramaAlertRepository
{
  constructor(
    @InjectRepository(EmociogramaAlertSchema)
    repository: Repository<EmociogramaAlertSchema>,
  ) {
    super(repository);
  }

  /**
   * Converte um schema do banco de dados para entidade de domínio
   */
  toDomain(schema: EmociogramaAlertSchema): EmociogramaAlertEntity {
    return new EmociogramaAlertEntity({
      id: schema.id,
      organizationId: schema.organizationId,
      submissionId: schema.submissionId,
      alertType: schema.alertType as AlertType,
      severity: schema.severity as AlertSeverity,
      message: schema.message,
      isResolved: schema.isResolved,
      resolvedAt: schema.resolvedAt ?? undefined,
      resolvedBy: schema.resolvedBy ?? undefined,
      resolutionNotes: schema.resolutionNotes ?? undefined,
      notifiedUsers: schema.notifiedUsers ?? [],
      notificationSentAt: schema.notificationSentAt ?? undefined,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
    });
  }

  /**
   * Converte uma entidade de domínio para schema do banco de dados
   */
  toEntity(domain: Partial<EmociogramaAlertEntity>): EmociogramaAlertSchema {
    const schema = new EmociogramaAlertSchema();

    if (domain.id !== undefined) schema.id = domain.id;
    if (domain.organizationId !== undefined)
      schema.organizationId = domain.organizationId;
    if (domain.submissionId !== undefined)
      schema.submissionId = domain.submissionId;
    if (domain.alertType !== undefined) schema.alertType = domain.alertType;
    if (domain.severity !== undefined) schema.severity = domain.severity;
    if (domain.message !== undefined) schema.message = domain.message;
    if (domain.isResolved !== undefined) schema.isResolved = domain.isResolved;
    if (domain.resolvedAt !== undefined)
      schema.resolvedAt = domain.resolvedAt ?? null;
    if (domain.resolvedBy !== undefined)
      schema.resolvedBy = domain.resolvedBy ?? null;
    if (domain.resolutionNotes !== undefined)
      schema.resolutionNotes = domain.resolutionNotes ?? null;
    if (domain.notifiedUsers !== undefined)
      schema.notifiedUsers =
        domain.notifiedUsers.length > 0 ? domain.notifiedUsers : null;
    if (domain.notificationSentAt !== undefined)
      schema.notificationSentAt = domain.notificationSentAt ?? null;

    return schema;
  }

  /**
   * Encontrar todos os alertas não resolvidos de uma organização
   *
   * Retorna alertas pendentes ordenados por severidade (críticos primeiro)
   * e data de criação (mais recentes primeiro).
   */
  async findUnresolved(
    organizationId: string,
  ): Promise<EmociogramaAlertEntity[]> {
    const schemas = await this.repository
      .createQueryBuilder('alert')
      .where('alert.organization_id = :organizationId', { organizationId })
      .andWhere('alert.is_resolved = :isResolved', { isResolved: false })
      .orderBy(
        `CASE alert.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END`,
        'ASC',
      )
      .addOrderBy('alert.created_at', 'DESC')
      .getMany();

    return schemas.map((s) => this.toDomain(s));
  }

  /**
   * Encontrar todos os alertas de uma organização com paginação
   *
   * Permite filtrar por severidade e incluir/excluir alertas resolvidos.
   */
  async findByOrganization(
    organizationId: string,
    options?: AlertFindOptions,
  ): Promise<AlertPaginatedResult> {
    const take = options?.take ?? 10;
    const skip = options?.skip ?? 0;

    const queryBuilder = this.repository
      .createQueryBuilder('alert')
      .where('alert.organization_id = :organizationId', { organizationId });

    // Filtrar por status de resolução
    if (!options?.includeResolved) {
      queryBuilder.andWhere('alert.is_resolved = :isResolved', {
        isResolved: false,
      });
    }

    // Filtrar por severidade
    if (options?.severity) {
      queryBuilder.andWhere('alert.severity = :severity', {
        severity: options.severity,
      });
    }

    // Ordenar por severidade e data
    queryBuilder
      .orderBy(
        `CASE alert.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END`,
        'ASC',
      )
      .addOrderBy('alert.created_at', 'DESC')
      .take(take)
      .skip(skip);

    const [schemas, total] = await queryBuilder.getManyAndCount();

    return {
      data: schemas.map((s) => this.toDomain(s)),
      total,
    };
  }

  /**
   * Encontrar alerta por ID de submissão
   *
   * Cada submissão pode ter no máximo um alerta associado.
   */
  async findBySubmission(
    submissionId: string,
  ): Promise<EmociogramaAlertEntity | null> {
    const schema = await this.repository.findOne({
      where: { submissionId },
    });

    return schema ? this.toDomain(schema) : null;
  }

  /**
   * Obter estatísticas de alertas para o dashboard
   *
   * Retorna métricas consolidadas:
   * - Total de alertas
   * - Distribuição por severidade
   * - Quantidade de não resolvidos
   * - Resolvidos nas últimas 24 horas
   */
  async getStatistics(organizationId: string): Promise<AlertStatistics> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Executar todas as queries em paralelo
    const [total, bySeverityResults, unresolved, resolvedTodayCount] =
      await Promise.all([
        // Total de alertas
        this.repository.count({
          where: { organizationId },
        }),

        // Contagem por severidade
        this.repository
          .createQueryBuilder('alert')
          .select('alert.severity', 'severity')
          .addSelect('COUNT(*)', 'count')
          .where('alert.organization_id = :organizationId', { organizationId })
          .groupBy('alert.severity')
          .getRawMany<{ severity: string; count: string }>(),

        // Total não resolvidos
        this.repository.count({
          where: {
            organizationId,
            isResolved: false,
          },
        }),

        // Resolvidos hoje
        this.repository
          .createQueryBuilder('alert')
          .where('alert.organization_id = :organizationId', { organizationId })
          .andWhere('alert.is_resolved = :isResolved', { isResolved: true })
          .andWhere('alert.resolved_at >= :todayStart', { todayStart })
          .getCount(),
      ]);

    // Processar resultados de severidade
    const bySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const row of bySeverityResults) {
      const severity = row.severity as AlertSeverity;
      if (severity in bySeverity) {
        bySeverity[severity] = parseInt(row.count, 10);
      }
    }

    return {
      total,
      bySeverity,
      unresolved,
      resolvedToday: resolvedTodayCount,
    };
  }

  /**
   * Encontrar alertas por severidade
   */
  async findBySeverity(
    organizationId: string,
    severity: AlertSeverity,
  ): Promise<EmociogramaAlertEntity[]> {
    const schemas = await this.repository.find({
      where: {
        organizationId,
        severity,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return schemas.map((s) => this.toDomain(s));
  }

  /**
   * Contar alertas não resolvidos por severidade
   *
   * Útil para badges e indicadores visuais no dashboard.
   */
  async countUnresolvedBySeverity(
    organizationId: string,
  ): Promise<Record<AlertSeverity, number>> {
    const results = await this.repository
      .createQueryBuilder('alert')
      .select('alert.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('alert.organization_id = :organizationId', { organizationId })
      .andWhere('alert.is_resolved = :isResolved', { isResolved: false })
      .groupBy('alert.severity')
      .getRawMany<{ severity: string; count: string }>();

    const counts: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const row of results) {
      const severity = row.severity as AlertSeverity;
      if (severity in counts) {
        counts[severity] = parseInt(row.count, 10);
      }
    }

    return counts;
  }

  /**
   * Encontrar alertas criados em um período
   */
  async findByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EmociogramaAlertEntity[]> {
    const schemas = await this.repository.find({
      where: {
        organizationId,
        createdAt: Between(startDate, endDate),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return schemas.map((s) => this.toDomain(s));
  }

  /**
   * Marcar múltiplos alertas como resolvidos em lote
   *
   * Útil para operações de bulk quando um gestor resolve
   * vários alertas de uma vez.
   */
  async bulkResolve(
    alertIds: string[],
    resolvedBy: string,
    notes?: string,
  ): Promise<number> {
    if (alertIds.length === 0) {
      return 0;
    }

    const now = new Date();

    const result = await this.repository
      .createQueryBuilder()
      .update(EmociogramaAlertSchema)
      .set({
        isResolved: true,
        resolvedAt: now,
        resolvedBy,
        resolutionNotes: notes ?? null,
        updatedAt: now,
      })
      .where('id IN (:...alertIds)', { alertIds })
      .andWhere('is_resolved = :isResolved', { isResolved: false })
      .execute();

    return result.affected ?? 0;
  }
}
