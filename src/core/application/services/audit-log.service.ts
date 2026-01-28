import { Injectable, Inject, Logger } from '@nestjs/common';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import { AUDIT_LOG_REPOSITORY } from '../../domain/repositories/audit-log.repository.interface';
import type { IAuditLogRepository } from '../../domain/repositories/audit-log.repository.interface';
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
 * Orquestra operações de auditoria delegando persistência ao repositório.
 * Segue Clean Architecture - depende apenas de interfaces da camada Domain.
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

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  /**
   * Registrar uma ação na trilha de auditoria
   */
  async log(entry: AuditLogEntry): Promise<AuditLogEntity> {
    const entity = AuditLogEntity.create({
      action: entry.action,
      userId: entry.userId,
      organizationId: entry.organizationId,
      performedBy: entry.performedBy,
      metadata: entry.metadata,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });

    const saved = await this.auditLogRepository.create(entity);

    // Log adicional para ações LGPD
    if (saved.isLgpdAction()) {
      this.logger.warn(
        `LGPD Action Logged: ${entry.action} - User: ${entry.userId} - Org: ${entry.organizationId || 'N/A'}`,
      );
    }

    this.logger.debug(`Audit log created: ${saved.id} - Action: ${saved.action}`);

    return saved;
  }

  /**
   * Obter trilha de auditoria para um usuário
   */
  async getAuditTrail(
    userId: string,
    organizationId?: string,
    options?: AuditTrailOptions,
  ): Promise<AuditTrailResult> {
    const result = await this.auditLogRepository.findByUser(
      userId,
      organizationId,
      {
        action: options?.action,
        startDate: options?.startDate,
        endDate: options?.endDate,
        limit: options?.limit,
        offset: options?.offset,
      },
    );

    return {
      data: result.data,
      total: result.total,
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
    const result = await this.auditLogRepository.findByAction(
      action,
      organizationId,
      {
        startDate: options?.startDate,
        endDate: options?.endDate,
        limit: options?.limit,
        offset: options?.offset,
      },
    );

    return {
      data: result.data,
      total: result.total,
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

    const deletedCount = await this.auditLogRepository.deleteOlderThan(retentionDate);

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
}
