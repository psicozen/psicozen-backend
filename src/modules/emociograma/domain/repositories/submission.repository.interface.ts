import type { IBaseRepository } from '../../../../core/domain/repositories/base.repository.interface';
import type {
  PaginatedResult,
  FindOptions,
} from '../../../../core/domain/repositories/base.repository.interface';
import type { EmociogramaSubmissionEntity } from '../entities/submission.entity';

/**
 * Filtros para consultas de agregação
 */
export interface AggregationFilters {
  department?: string;
  team?: string;
  categoryId?: string;
  minEmotionLevel?: number;
  maxEmotionLevel?: number;
}

/**
 * Dados agregados retornados pelas consultas de relatório
 */
export interface AggregatedData {
  totalSubmissions: number;
  averageEmotionLevel: number;
  distributionByLevel: Record<number, number>; // { 1: 15, 2: 30, ... }
  distributionByCategory: Record<string, number>; // { 'uuid-categoria': 45, ... }
  anonymousCount: number;
  identifiedCount: number;
  trendData: TrendDataPoint[];
}

/**
 * Ponto de dados de tendência para gráficos temporais
 */
export interface TrendDataPoint {
  date: string;
  avgLevel: number;
}

/**
 * Pontuação de motivação de um usuário
 */
export interface UserMotivationScore {
  userId: string;
  averageEmotionLevel: number;
  submissionCount: number;
  lastSubmittedAt: Date;
}

/**
 * Intervalo de tempo para consultas
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Interface do Repositório de Submissões do Emociograma
 *
 * Define o contrato para persistência e consultas de submissões de emociograma.
 * Inclui métodos especializados para agregação, analytics e conformidade LGPD.
 */
export interface IEmociogramaSubmissionRepository
  extends IBaseRepository<EmociogramaSubmissionEntity> {
  /**
   * Encontrar submissões por usuário com paginação
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   * @param options - Opções de paginação e ordenação
   * @returns Resultado paginado de submissões
   */
  findByUser(
    userId: string,
    organizationId: string,
    options?: FindOptions,
  ): Promise<PaginatedResult<EmociogramaSubmissionEntity>>;

  /**
   * Obter dados agregados para intervalo de tempo com filtros opcionais
   *
   * Retorna estatísticas agregadas incluindo:
   * - Total de submissões
   * - Média de nível de emoção
   * - Distribuição por nível e categoria
   * - Contagem de anônimas vs identificadas
   * - Dados de tendência diária
   *
   * @param organizationId - ID da organização
   * @param startDate - Data inicial do intervalo
   * @param endDate - Data final do intervalo
   * @param filters - Filtros opcionais (departamento, equipe, categoria, níveis)
   * @returns Dados agregados
   */
  getAggregatedByTimeRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: AggregationFilters,
  ): Promise<AggregatedData>;

  /**
   * Encontrar submissões acima do limite de emoção (para alertas)
   *
   * Usado para detectar colaboradores que precisam de atenção
   * baseado no nível de emoção reportado.
   *
   * @param organizationId - ID da organização
   * @param threshold - Limite mínimo de emoção (ex: 6)
   * @param since - Data a partir da qual buscar
   * @returns Lista de submissões acima do limite
   */
  findSubmissionsAboveThreshold(
    organizationId: string,
    threshold: number,
    since: Date,
  ): Promise<EmociogramaSubmissionEntity[]>;

  /**
   * Obter usuários mais motivados (menores níveis médios de emoção)
   *
   * Na escala do emociograma, níveis mais baixos (1-5) indicam
   * estados emocionais mais positivos.
   *
   * @param organizationId - ID da organização
   * @param limit - Número máximo de resultados
   * @returns Lista de pontuações de motivação ordenada por melhor motivação
   */
  getMostMotivated(
    organizationId: string,
    limit: number,
  ): Promise<UserMotivationScore[]>;

  /**
   * Obter usuários menos motivados (maiores níveis médios de emoção)
   *
   * Na escala do emociograma, níveis mais altos (6-10) indicam
   * estados emocionais que requerem atenção.
   *
   * @param organizationId - ID da organização
   * @param limit - Número máximo de resultados
   * @returns Lista de pontuações de motivação ordenada por menor motivação
   */
  getLeastMotivated(
    organizationId: string,
    limit: number,
  ): Promise<UserMotivationScore[]>;

  /**
   * Obter dados agregados por departamento
   *
   * @param organizationId - ID da organização
   * @param department - Nome do departamento
   * @param timeRange - Intervalo de tempo
   * @returns Dados agregados do departamento
   */
  getByDepartment(
    organizationId: string,
    department: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData>;

  /**
   * Obter dados agregados por equipe
   *
   * @param organizationId - ID da organização
   * @param team - Nome da equipe
   * @param timeRange - Intervalo de tempo
   * @returns Dados agregados da equipe
   */
  getByTeam(
    organizationId: string,
    team: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData>;

  /**
   * Deletar todas as submissões do usuário (direito LGPD ao apagamento)
   *
   * Executa hard delete de todas as submissões do usuário na organização.
   * Usado para atender solicitações de exclusão de dados pessoais.
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   */
  deleteByUser(userId: string, organizationId: string): Promise<void>;

  /**
   * Anonimizar todas as submissões do usuário (anonimização de dados LGPD)
   *
   * Marca todas as submissões como anônimas e remove comentários.
   * Mantém os dados agregados para análise enquanto protege a identidade.
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   */
  anonymizeByUser(userId: string, organizationId: string): Promise<void>;
}

/**
 * Token de injeção de dependência para o repositório
 */
export const EMOCIOGRAMA_SUBMISSION_REPOSITORY = Symbol(
  'IEmociogramaSubmissionRepository',
);
