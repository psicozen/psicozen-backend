import type { AuditLogEntity } from '../../domain/entities/audit-log.entity';

/**
 * Tipos de ações de auditoria
 */
export type AuditAction =
  | 'user_data_anonymized'
  | 'user_data_exported'
  | 'user_data_deleted'
  | 'data_deletion_requested'
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'data_access'
  | 'data_modification'
  | 'permission_change'
  | 'role_assigned'
  | 'role_removed'
  | 'security_event'
  | 'api_access';

/**
 * Entrada de log de auditoria para registro
 */
export interface AuditLogEntry {
  /** Ação realizada */
  action: AuditAction | string;

  /** ID do usuário alvo ou que realizou a ação */
  userId: string;

  /** ID da organização relacionada */
  organizationId?: string;

  /** ID do usuário que executou a ação (se diferente do userId) */
  performedBy?: string;

  /** Metadados adicionais */
  metadata?: Record<string, unknown>;

  /** Endereço IP da requisição */
  ipAddress?: string;

  /** User Agent da requisição */
  userAgent?: string;
}

/**
 * Opções para consulta de trilha de auditoria
 */
export interface AuditTrailOptions {
  /** Filtrar por ação específica */
  action?: AuditAction | string;

  /** Data inicial do período */
  startDate?: Date;

  /** Data final do período */
  endDate?: Date;

  /** Número máximo de registros */
  limit?: number;

  /** Offset para paginação */
  offset?: number;
}

/**
 * Resultado da consulta de trilha de auditoria
 */
export interface AuditTrailResult {
  /** Registros de auditoria */
  data: AuditLogEntity[];

  /** Total de registros */
  total: number;
}

/**
 * Resultado de operação de limpeza
 */
export interface CleanupResult {
  /** Número de registros removidos */
  deletedCount: number;

  /** Data limite usada para limpeza */
  retentionDate: Date;
}

/**
 * Interface do Serviço de Log de Auditoria
 *
 * Define o contrato para registro e consulta de eventos de auditoria.
 * Essencial para conformidade LGPD e rastreabilidade de operações
 * sensíveis relacionadas a dados pessoais.
 */
export interface IAuditLogService {
  /**
   * Registrar uma ação na trilha de auditoria
   *
   * @param entry - Dados da entrada de auditoria
   * @returns Entidade de auditoria criada
   */
  log(entry: AuditLogEntry): Promise<AuditLogEntity>;

  /**
   * Obter trilha de auditoria para um usuário
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização (opcional)
   * @param options - Opções de filtro e paginação
   * @returns Resultado com registros e total
   */
  getAuditTrail(
    userId: string,
    organizationId?: string,
    options?: AuditTrailOptions,
  ): Promise<AuditTrailResult>;

  /**
   * Obter trilha de auditoria por ação
   *
   * @param action - Tipo de ação
   * @param organizationId - ID da organização (opcional)
   * @param options - Opções de filtro e paginação
   * @returns Resultado com registros e total
   */
  getByAction(
    action: AuditAction | string,
    organizationId?: string,
    options?: AuditTrailOptions,
  ): Promise<AuditTrailResult>;

  /**
   * Limpar logs antigos (política de retenção de 2 anos)
   *
   * Deve ser executado via cron job para manter conformidade LGPD.
   *
   * @returns Resultado da limpeza
   */
  cleanupOldLogs(): Promise<CleanupResult>;
}

/**
 * Token de injeção de dependência para o serviço de auditoria
 */
export const AUDIT_LOG_SERVICE = Symbol('IAuditLogService');
