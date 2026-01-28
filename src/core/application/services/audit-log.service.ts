import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
 * Esta implementação utiliza armazenamento em memória para logs de auditoria.
 * Em produção, deve ser substituída por uma implementação com persistência
 * em banco de dados (TypeORM) para conformidade LGPD.
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

  /** Armazenamento em memória (substituir por banco de dados em produção) */
  private readonly logs: AuditLogEntity[] = [];

  /** Período de retenção em anos (conforme LGPD) */
  private readonly RETENTION_YEARS = 2;

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

    // Atribuir ID único
    entity.id = randomUUID();

    // Armazenar log
    this.logs.push(entity);

    // Log estruturado
    this.logger.log(
      JSON.stringify({
        id: entity.id,
        action: entity.action,
        userId: entity.userId,
        organizationId: entity.organizationId,
        timestamp: entity.createdAt.toISOString(),
        metadata: entity.metadata,
      }),
    );

    // Log adicional para ações LGPD
    if (entity.isLgpdAction()) {
      this.logger.warn(
        `LGPD Action Logged: ${entry.action} - User: ${entry.userId} - Org: ${entry.organizationId || 'N/A'}`,
      );
    }

    this.logger.debug(`Audit log created: ${entity.id} - Action: ${entity.action}`);

    return entity;
  }

  /**
   * Obter trilha de auditoria para um usuário
   */
  async getAuditTrail(
    userId: string,
    organizationId?: string,
    options?: AuditTrailOptions,
  ): Promise<AuditTrailResult> {
    let filtered = this.logs.filter((log) => log.userId === userId);

    if (organizationId) {
      filtered = filtered.filter((log) => log.organizationId === organizationId);
    }

    if (options?.action) {
      filtered = filtered.filter((log) => log.action === options.action);
    }

    if (options?.startDate) {
      filtered = filtered.filter((log) => log.createdAt >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter((log) => log.createdAt <= options.endDate!);
    }

    // Ordenar por data decrescente
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filtered.length;

    // Aplicar paginação
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const data = filtered.slice(offset, offset + limit);

    return { data, total };
  }

  /**
   * Obter trilha de auditoria por ação
   */
  async getByAction(
    action: string,
    organizationId?: string,
    options?: AuditTrailOptions,
  ): Promise<AuditTrailResult> {
    let filtered = this.logs.filter((log) => log.action === action);

    if (organizationId) {
      filtered = filtered.filter((log) => log.organizationId === organizationId);
    }

    if (options?.startDate) {
      filtered = filtered.filter((log) => log.createdAt >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter((log) => log.createdAt <= options.endDate!);
    }

    // Ordenar por data decrescente
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = filtered.length;

    // Aplicar paginação
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const data = filtered.slice(offset, offset + limit);

    return { data, total };
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

    const initialCount = this.logs.length;

    // Remover logs antigos
    const indexesToRemove: number[] = [];
    this.logs.forEach((log, index) => {
      if (log.createdAt < retentionDate) {
        indexesToRemove.push(index);
      }
    });

    // Remover de trás para frente para não afetar índices
    for (let i = indexesToRemove.length - 1; i >= 0; i--) {
      this.logs.splice(indexesToRemove[i], 1);
    }

    const deletedCount = initialCount - this.logs.length;

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
