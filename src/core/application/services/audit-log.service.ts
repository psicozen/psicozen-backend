import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { AuditLogSchema } from '../../infrastructure/persistence/audit-log.schema';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import type {
  IAuditLogService,
  AuditLogEntry,
  AuditTrailOptions,
  AuditTrailResult,
  CleanupResult,
} from './audit-log.service.interface';

/**
 * Implementação do Serviço de Log de Auditoria
 *
 * Persiste eventos de auditoria no banco de dados PostgreSQL.
 * Essencial para conformidade LGPD, registrando todas as operações
 * relacionadas a dados pessoais.
 *
 * Funcionalidades:
 * - Registro de eventos de auditoria
 * - Consulta de trilha de auditoria por usuário
 * - Consulta por tipo de ação
 * - Limpeza automática de logs antigos (retenção de 2 anos)
 */
@Injectable()
export class AuditLogService implements IAuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  /** Período de retenção em anos (conforme LGPD) */
  private readonly RETENTION_YEARS = 2;

  /** Limite padrão para consultas */
  private readonly DEFAULT_LIMIT = 100;

  constructor(
    @InjectRepository(AuditLogSchema)
    private readonly auditLogRepository: Repository<AuditLogSchema>,
  ) {}

  /**
   * Registrar uma ação na trilha de auditoria
   */
  async log(entry: AuditLogEntry): Promise<AuditLogEntity> {
    const schema = this.auditLogRepository.create({
      action: entry.action,
      userId: entry.userId,
      organizationId: entry.organizationId ?? null,
      performedBy: entry.performedBy ?? null,
      metadata: entry.metadata || {},
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      createdAt: new Date(),
    });

    const saved = await this.auditLogRepository.save(schema);

    // Log adicional para ações LGPD
    if (this.isLgpdAction(entry.action)) {
      this.logger.warn(
        `LGPD Action Logged: ${entry.action} - User: ${entry.userId} - Org: ${entry.organizationId || 'N/A'}`,
      );
    }

    this.logger.debug(`Audit log created: ${saved.id} - Action: ${saved.action}`);

    return this.toDomain(saved);
  }

  /**
   * Obter trilha de auditoria para um usuário
   */
  async getAuditTrail(
    userId: string,
    organizationId?: string,
    options?: AuditTrailOptions,
  ): Promise<AuditTrailResult> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_logs')
      .where('audit_logs.user_id = :userId', { userId });

    if (organizationId) {
      queryBuilder.andWhere('audit_logs.organization_id = :organizationId', {
        organizationId,
      });
    }

    // Aplicar filtros opcionais
    this.applyFilters(queryBuilder, options);

    // Ordenar e paginar
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
   * Obter trilha de auditoria por ação
   */
  async getByAction(
    action: string,
    organizationId?: string,
    options?: AuditTrailOptions,
  ): Promise<AuditTrailResult> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_logs')
      .where('audit_logs.action = :action', { action });

    if (organizationId) {
      queryBuilder.andWhere('audit_logs.organization_id = :organizationId', {
        organizationId,
      });
    }

    // Aplicar filtros opcionais
    this.applyFilters(queryBuilder, options);

    // Ordenar e paginar
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
   * Limpar logs antigos (política de retenção de 2 anos)
   *
   * IMPORTANTE: Este método deve ser executado via cron job
   * para manter conformidade LGPD e gerenciar armazenamento.
   */
  async cleanupOldLogs(): Promise<CleanupResult> {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - this.RETENTION_YEARS);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .from(AuditLogSchema)
      .where('created_at < :retentionDate', { retentionDate })
      .execute();

    const deletedCount = result.affected ?? 0;

    if (deletedCount > 0) {
      this.logger.log(
        `Audit log cleanup completed: ${deletedCount} records removed (retention date: ${retentionDate.toISOString()})`,
      );
    }

    return {
      deletedCount,
      retentionDate,
    };
  }

  /**
   * Aplicar filtros opcionais ao query builder
   */
  private applyFilters(
    queryBuilder: ReturnType<typeof this.auditLogRepository.createQueryBuilder>,
    options?: AuditTrailOptions,
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
   * Verifica se a ação é relacionada a LGPD
   */
  private isLgpdAction(action: string): boolean {
    const lgpdActions = [
      'user_data_anonymized',
      'user_data_exported',
      'user_data_deleted',
    ];
    return lgpdActions.includes(action);
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
