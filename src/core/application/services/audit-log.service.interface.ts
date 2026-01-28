/**
 * Tipos de ações de auditoria
 */
export type AuditAction =
  | 'user_data_anonymized'
  | 'user_data_exported'
  | 'user_data_deleted'
  | 'user_login'
  | 'user_logout'
  | 'data_access'
  | 'data_modification'
  | 'permission_change'
  | 'security_event';

/**
 * Entrada de log de auditoria
 */
export interface AuditLogEntry {
  /** Ação realizada */
  action: AuditAction | string;
  /** ID do usuário que realizou ou foi alvo da ação */
  userId: string;
  /** ID da organização */
  organizationId: string;
  /** Metadados adicionais */
  metadata?: Record<string, unknown>;
  /** ID do usuário que executou a ação (se diferente do userId) */
  performedBy?: string;
  /** Endereço IP da requisição */
  ipAddress?: string;
  /** User Agent da requisição */
  userAgent?: string;
}

/**
 * Resultado de uma operação de auditoria
 */
export interface AuditLogResult {
  /** ID único do log */
  id: string;
  /** Timestamp da criação */
  timestamp: Date;
  /** Indica se foi registrado com sucesso */
  success: boolean;
}

/**
 * Interface do Serviço de Log de Auditoria
 *
 * Define o contrato para registro de eventos de auditoria.
 * Essencial para conformidade LGPD e rastreabilidade de operações
 * sensíveis relacionadas a dados pessoais.
 */
export interface IAuditLogService {
  /**
   * Registrar um evento de auditoria
   *
   * @param entry - Dados do evento a ser registrado
   * @returns Resultado da operação de log
   */
  log(entry: AuditLogEntry): Promise<AuditLogResult>;

  /**
   * Consultar logs de auditoria por usuário
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   * @param options - Opções de consulta (data inicial, final, limite)
   * @returns Lista de entradas de auditoria
   */
  findByUser?(
    userId: string,
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<AuditLogEntry[]>;

  /**
   * Consultar logs de auditoria por ação
   *
   * @param action - Tipo de ação
   * @param organizationId - ID da organização
   * @param options - Opções de consulta
   * @returns Lista de entradas de auditoria
   */
  findByAction?(
    action: AuditAction | string,
    organizationId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<AuditLogEntry[]>;
}

/**
 * Token de injeção de dependência para o serviço de auditoria
 */
export const AUDIT_LOG_SERVICE = Symbol('IAuditLogService');
