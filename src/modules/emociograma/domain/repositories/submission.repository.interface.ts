import {
  FindOptions,
  IBaseRepository,
  PaginatedResult,
} from '../../../../core/domain/repositories/base.repository.interface';
import { EmociogramaSubmissionEntity } from '../entities/submission.entity';

/**
 * Filtros para consultas de agregação de dados do emociograma
 */
export interface AggregationFilters {
  /** Filtrar por departamento específico */
  department?: string;
  /** Filtrar por equipe específica */
  team?: string;
  /** Filtrar por categoria de emoção */
  categoryId?: string;
  /** Nível mínimo de emoção (inclusivo) */
  minEmotionLevel?: number;
  /** Nível máximo de emoção (inclusivo) */
  maxEmotionLevel?: number;
}

/**
 * Dados agregados de submissões para relatórios e dashboards
 */
export interface AggregatedData {
  /** Total de submissões no período/filtro */
  totalSubmissions: number;
  /** Média do nível de emoção (1-10) */
  averageEmotionLevel: number;
  /** Distribuição por nível de emoção: { 1: 15, 2: 30, ... 10: 5 } */
  distributionByLevel: Record<number, number>;
  /** Distribuição por categoria: { 'trabalho': 45, 'pessoal': 20, ... } */
  distributionByCategory: Record<string, number>;
  /** Quantidade de submissões anônimas */
  anonymousCount: number;
  /** Quantidade de submissões identificadas */
  identifiedCount: number;
  /** Dados de tendência temporal: médias diárias */
  trendData: TrendDataPoint[];
}

/**
 * Ponto de dados de tendência temporal
 */
export interface TrendDataPoint {
  /** Data no formato ISO (YYYY-MM-DD) */
  date: string;
  /** Média do nível de emoção nessa data */
  avgLevel: number;
  /** Contagem de submissões nessa data */
  count: number;
}

/**
 * Score de motivação de um usuário para rankings
 */
export interface UserMotivationScore {
  /** ID do usuário */
  userId: string;
  /** Média do nível de emoção do usuário */
  averageEmotionLevel: number;
  /** Total de submissões do usuário */
  submissionCount: number;
  /** Data da última submissão */
  lastSubmittedAt: Date;
}

/**
 * Intervalo de tempo para consultas
 */
export interface TimeRange {
  /** Data de início (inclusiva) */
  startDate: Date;
  /** Data de fim (inclusiva) */
  endDate: Date;
}

/**
 * Interface do repositório de submissões de emociograma
 *
 * Define operações de persistência e consulta para EmociogramaSubmissionEntity.
 * Inclui métodos especializados para:
 * - Consultas por usuário/organização
 * - Agregação de dados para relatórios
 * - Detecção de alertas
 * - Analytics de motivação
 * - Conformidade LGPD
 */
export interface IEmociogramaSubmissionRepository
  extends IBaseRepository<EmociogramaSubmissionEntity> {
  /**
   * Encontrar submissões por usuário com paginação
   *
   * Usado para o histórico pessoal de submissões do colaborador.
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
   * Principal método para dashboards e relatórios gerenciais.
   * Retorna estatísticas consolidadas das submissões.
   *
   * @param organizationId - ID da organização
   * @param startDate - Data de início do intervalo
   * @param endDate - Data de fim do intervalo
   * @param filters - Filtros opcionais (departamento, equipe, categoria, níveis)
   * @returns Dados agregados incluindo médias, distribuições e tendências
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
   * Identifica submissões que requerem atenção imediata.
   * Por padrão, emotion_level >= 6 indica emoções negativas.
   *
   * @param organizationId - ID da organização
   * @param threshold - Limite de nível de emoção (ex: 6)
   * @param since - Data a partir da qual buscar alertas
   * @returns Lista de submissões que excedem o limite
   */
  findSubmissionsAboveThreshold(
    organizationId: string,
    threshold: number,
    since: Date,
  ): Promise<EmociogramaSubmissionEntity[]>;

  /**
   * Obter usuários mais motivados (menores níveis médios de emoção)
   *
   * Ranking de colaboradores com melhores indicadores emocionais.
   * Níveis mais baixos (1-5) indicam emoções positivas.
   * Exclui submissões anônimas para proteger privacidade.
   *
   * @param organizationId - ID da organização
   * @param limit - Número máximo de usuários a retornar
   * @returns Lista ordenada por menor média de emoção
   */
  getMostMotivated(
    organizationId: string,
    limit: number,
  ): Promise<UserMotivationScore[]>;

  /**
   * Obter usuários menos motivados (maiores níveis médios de emoção)
   *
   * Identifica colaboradores que podem precisar de suporte.
   * Níveis mais altos (6-10) indicam emoções negativas.
   * Exclui submissões anônimas para proteger privacidade.
   *
   * @param organizationId - ID da organização
   * @param limit - Número máximo de usuários a retornar
   * @returns Lista ordenada por maior média de emoção
   */
  getLeastMotivated(
    organizationId: string,
    limit: number,
  ): Promise<UserMotivationScore[]>;

  /**
   * Obter dados agregados por departamento
   *
   * Relatório consolidado para um departamento específico.
   *
   * @param organizationId - ID da organização
   * @param department - Nome do departamento
   * @param timeRange - Intervalo de tempo para consulta
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
   * Relatório consolidado para uma equipe específica.
   *
   * @param organizationId - ID da organização
   * @param team - Nome da equipe
   * @param timeRange - Intervalo de tempo para consulta
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
   * Implementa o "direito ao esquecimento" da LGPD.
   * Remove permanentemente todas as submissões de um usuário.
   * ATENÇÃO: Operação irreversível.
   *
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   */
  deleteByUser(userId: string, organizationId: string): Promise<void>;

  /**
   * Anonimizar todas as submissões do usuário (anonimização de dados LGPD)
   *
   * Alternativa ao apagamento que preserva dados estatísticos.
   * Remove identificação pessoal mas mantém dados para análise.
   * Define isAnonymous=true e limpa userId.
   *
   * @param userId - ID do usuário a ser anonimizado
   * @param organizationId - ID da organização
   */
  anonymizeByUser(userId: string, organizationId: string): Promise<void>;

  /**
   * Contar submissões que excedem limite (para métricas rápidas)
   *
   * Versão otimizada para contagem rápida de alertas ativos.
   *
   * @param organizationId - ID da organização
   * @param threshold - Limite de nível de emoção
   * @param since - Data a partir da qual contar
   * @returns Contagem de submissões acima do limite
   */
  countAboveThreshold(
    organizationId: string,
    threshold: number,
    since: Date,
  ): Promise<number>;

  /**
   * Encontrar submissões com comentários sinalizados para moderação
   *
   * Lista submissões cujos comentários precisam de revisão.
   *
   * @param organizationId - ID da organização
   * @param options - Opções de paginação
   * @returns Resultado paginado de submissões sinalizadas
   */
  findFlaggedComments(
    organizationId: string,
    options?: FindOptions,
  ): Promise<PaginatedResult<EmociogramaSubmissionEntity>>;
}

/**
 * Token de injeção de dependência para IEmociogramaSubmissionRepository
 *
 * Uso:
 * ```typescript
 * // No módulo
 * providers: [
 *   {
 *     provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
 *     useClass: EmociogramaSubmissionRepository,
 *   },
 * ]
 *
 * // No use case
 * constructor(
 *   @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
 *   private readonly submissionRepository: IEmociogramaSubmissionRepository,
 * ) {}
 * ```
 */
export const EMOCIOGRAMA_SUBMISSION_REPOSITORY = Symbol(
  'IEmociogramaSubmissionRepository',
);
