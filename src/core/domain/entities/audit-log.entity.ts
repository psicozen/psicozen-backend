/**
 * Tipos de ações de auditoria
 */
export type AuditAction =
  | 'user_data_anonymized'
  | 'user_data_exported'
  | 'user_data_deleted'
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
 * Entidade de Domínio - Log de Auditoria
 *
 * Representa uma entrada de auditoria para conformidade LGPD.
 * Registros são imutáveis após criação.
 *
 * Política de retenção: 2 anos
 */
export class AuditLogEntity {
  /** ID único do registro */
  id: string;

  /** Tipo de ação realizada */
  action: AuditAction | string;

  /** ID do usuário alvo ou que realizou a ação */
  userId: string;

  /** ID da organização relacionada */
  organizationId?: string;

  /** ID do usuário que executou a ação (se diferente do userId) */
  performedBy?: string;

  /** Metadados adicionais da ação */
  metadata: Record<string, unknown>;

  /** Endereço IP do cliente */
  ipAddress?: string;

  /** User Agent do cliente */
  userAgent?: string;

  /** Data de criação do registro */
  createdAt: Date;

  constructor(partial?: Partial<AuditLogEntity>) {
    if (partial) {
      Object.assign(this, partial);
    }
    // Garantir que metadata nunca seja undefined
    this.metadata = this.metadata || {};
  }

  /**
   * Factory method para criar uma nova entrada de auditoria
   */
  static create(params: {
    action: AuditAction | string;
    userId: string;
    organizationId?: string;
    performedBy?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditLogEntity {
    return new AuditLogEntity({
      action: params.action,
      userId: params.userId,
      organizationId: params.organizationId,
      performedBy: params.performedBy,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: new Date(),
    });
  }

  /**
   * Verifica se a ação é relacionada a LGPD
   */
  isLgpdAction(): boolean {
    const lgpdActions = [
      'user_data_anonymized',
      'user_data_exported',
      'user_data_deleted',
    ];
    return lgpdActions.includes(this.action);
  }

  /**
   * Verifica se a ação é um evento de segurança
   */
  isSecurityEvent(): boolean {
    const securityActions = [
      'user_login',
      'user_logout',
      'security_event',
      'permission_change',
    ];
    return securityActions.includes(this.action);
  }
}
