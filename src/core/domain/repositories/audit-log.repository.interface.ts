import type { AuditLogEntity } from '../entities/audit-log.entity';

/**
 * Opções para consulta de logs de auditoria
 */
export interface AuditLogQueryOptions {
  /** Filtrar por ação específica */
  action?: string;

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
 * Resultado paginado de logs de auditoria
 */
export interface AuditLogPaginatedResult {
  /** Registros de auditoria */
  data: AuditLogEntity[];

  /** Total de registros */
  total: number;
}

/**
 * Interface do Repositório de Logs de Auditoria
 *
 * Define o contrato para persistência e consulta de logs de auditoria.
 * Segue Clean Architecture - interface na camada Domain, implementação na Infrastructure.
 */
export interface IAuditLogRepository {
  /**
   * Criar uma nova entrada de log de auditoria
   *
   * @param entity - Entidade de log a ser persistida
   * @returns Entidade persistida com ID gerado
   */
  create(entity: AuditLogEntity): Promise<AuditLogEntity>;

  /**
   * Buscar logs por usuário
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização (opcional)
   * @param options - Opções de filtro e paginação
   * @returns Resultado paginado
   */
  findByUser(
    userId: string,
    organizationId?: string,
    options?: AuditLogQueryOptions,
  ): Promise<AuditLogPaginatedResult>;

  /**
   * Buscar logs por ação
   *
   * @param action - Tipo de ação
   * @param organizationId - ID da organização (opcional)
   * @param options - Opções de filtro e paginação
   * @returns Resultado paginado
   */
  findByAction(
    action: string,
    organizationId?: string,
    options?: AuditLogQueryOptions,
  ): Promise<AuditLogPaginatedResult>;

  /**
   * Deletar logs antigos (política de retenção)
   *
   * @param olderThan - Data limite para exclusão
   * @returns Número de registros removidos
   */
  deleteOlderThan(olderThan: Date): Promise<number>;
}

/**
 * Token de injeção de dependência para o repositório
 */
export const AUDIT_LOG_REPOSITORY = Symbol('IAuditLogRepository');
