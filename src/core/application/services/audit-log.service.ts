import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  IAuditLogService,
  AuditLogEntry,
  AuditLogResult,
} from './audit-log.service.interface';

/**
 * Implementação do Serviço de Log de Auditoria
 *
 * Esta implementação utiliza o Logger do NestJS para registrar eventos de auditoria.
 * Em produção, pode ser substituída por uma implementação que persiste em banco de dados
 * ou envia para um serviço de logging centralizado (ex: CloudWatch, Datadog, ELK).
 *
 * Funcionalidades:
 * - Registro estruturado de eventos LGPD (anonimização, exportação, exclusão)
 * - Geração de IDs únicos para rastreabilidade
 * - Log em formato JSON para fácil parsing e análise
 */
@Injectable()
export class AuditLogService implements IAuditLogService {
  private readonly logger = new Logger('AuditLog');

  /**
   * Registrar um evento de auditoria
   *
   * @param entry - Dados do evento a ser registrado
   * @returns Resultado da operação de log
   */
  async log(entry: AuditLogEntry): Promise<AuditLogResult> {
    const id = randomUUID();
    const timestamp = new Date();

    const logData = {
      id,
      timestamp: timestamp.toISOString(),
      action: entry.action,
      userId: entry.userId,
      organizationId: entry.organizationId,
      performedBy: entry.performedBy,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
    };

    // Log em formato estruturado para fácil análise
    this.logger.log(JSON.stringify(logData));

    // Log adicional para ações LGPD (mais visibilidade)
    if (this.isLgpdAction(entry.action)) {
      this.logger.warn(
        `LGPD Action: ${entry.action} - User: ${entry.userId} - Org: ${entry.organizationId}`,
      );
    }

    return {
      id,
      timestamp,
      success: true,
    };
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
}
