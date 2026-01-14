import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  MoreThanOrEqual,
  Between,
  IsNull,
  SelectQueryBuilder,
} from 'typeorm';
import { TypeOrmBaseRepository } from '../../../../core/infrastructure/repositories/typeorm-base.repository';
import { EmociogramaSubmissionSchema } from '../persistence/submission.schema';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type {
  IEmociogramaSubmissionRepository,
  AggregatedData,
  UserMotivationScore,
  TimeRange,
  AggregationFilters,
  TrendDataPoint,
} from '../../domain/repositories/submission.repository.interface';
import type {
  PaginatedResult,
  FindOptions,
} from '../../../../core/domain/repositories/base.repository.interface';

/**
 * Implementação do Repositório de Submissões do Emociograma
 *
 * Estende TypeOrmBaseRepository para operações CRUD básicas e implementa
 * métodos especializados para agregação, analytics e conformidade LGPD.
 */
@Injectable()
export class EmociogramaSubmissionRepository
  extends TypeOrmBaseRepository<
    EmociogramaSubmissionSchema,
    EmociogramaSubmissionEntity
  >
  implements IEmociogramaSubmissionRepository
{
  constructor(
    @InjectRepository(EmociogramaSubmissionSchema)
    repository: Repository<EmociogramaSubmissionSchema>,
  ) {
    super(repository);
  }

  /**
   * Converte um schema do banco de dados para entidade de domínio
   */
  toDomain(schema: EmociogramaSubmissionSchema): EmociogramaSubmissionEntity {
    return new EmociogramaSubmissionEntity({
      id: schema.id,
      organizationId: schema.organizationId,
      userId: schema.userId,
      emotionLevel: schema.emotionLevel,
      emotionEmoji: schema.emotionEmoji,
      categoryId: schema.categoryId,
      isAnonymous: schema.isAnonymous,
      comment: schema.comment ?? undefined,
      commentFlagged: schema.commentFlagged,
      submittedAt: schema.submittedAt,
      department: schema.department ?? undefined,
      team: schema.team ?? undefined,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      deletedAt: schema.deletedAt ?? undefined,
    });
  }

  /**
   * Converte uma entidade de domínio para schema do banco de dados
   */
  toEntity(
    domain: Partial<EmociogramaSubmissionEntity>,
  ): EmociogramaSubmissionSchema {
    const schema = new EmociogramaSubmissionSchema();

    if (domain.id !== undefined) schema.id = domain.id;
    if (domain.organizationId !== undefined)
      schema.organizationId = domain.organizationId;
    if (domain.userId !== undefined) schema.userId = domain.userId;
    if (domain.emotionLevel !== undefined)
      schema.emotionLevel = domain.emotionLevel;
    if (domain.emotionEmoji !== undefined)
      schema.emotionEmoji = domain.emotionEmoji;
    if (domain.categoryId !== undefined) schema.categoryId = domain.categoryId;
    if (domain.isAnonymous !== undefined)
      schema.isAnonymous = domain.isAnonymous;
    if (domain.comment !== undefined) schema.comment = domain.comment ?? null;
    if (domain.commentFlagged !== undefined)
      schema.commentFlagged = domain.commentFlagged;
    if (domain.submittedAt !== undefined)
      schema.submittedAt = domain.submittedAt;
    if (domain.department !== undefined)
      schema.department = domain.department ?? null;
    if (domain.team !== undefined) schema.team = domain.team ?? null;

    return schema;
  }

  /**
   * Encontrar submissões por usuário com paginação
   */
  async findByUser(
    userId: string,
    organizationId: string,
    options?: FindOptions,
  ): Promise<PaginatedResult<EmociogramaSubmissionEntity>> {
    const take = options?.take ?? 10;
    const skip = options?.skip ?? 0;
    const page = skip > 0 ? Math.floor(skip / take) + 1 : 1;

    const queryBuilder = this.repository
      .createQueryBuilder('submission')
      .where('submission.user_id = :userId', { userId })
      .andWhere('submission.organization_id = :organizationId', {
        organizationId,
      })
      .andWhere('submission.deleted_at IS NULL')
      .orderBy('submission.submitted_at', 'DESC')
      .take(take)
      .skip(skip);

    const [schemas, total] = await queryBuilder.getManyAndCount();

    return {
      data: schemas.map((s) => this.toDomain(s)),
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Obter dados agregados para intervalo de tempo com filtros opcionais
   *
   * IMPORTANTE: Cada agregação usa um clone do queryBuilder base para evitar
   * modificações indesejadas entre as queries paralelas.
   */
  async getAggregatedByTimeRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    filters?: AggregationFilters,
  ): Promise<AggregatedData> {
    // Criar query builder base com filtros
    const createBaseQuery =
      (): SelectQueryBuilder<EmociogramaSubmissionSchema> => {
        let qb = this.repository
          .createQueryBuilder('submission')
          .where('submission.organization_id = :organizationId', {
            organizationId,
          })
          .andWhere('submission.submitted_at BETWEEN :startDate AND :endDate', {
            startDate,
            endDate,
          })
          .andWhere('submission.deleted_at IS NULL');

        // Aplicar filtros opcionais
        if (filters?.department) {
          qb = qb.andWhere('submission.department = :department', {
            department: filters.department,
          });
        }
        if (filters?.team) {
          qb = qb.andWhere('submission.team = :team', { team: filters.team });
        }
        if (filters?.categoryId) {
          qb = qb.andWhere('submission.category_id = :categoryId', {
            categoryId: filters.categoryId,
          });
        }
        if (filters?.minEmotionLevel !== undefined) {
          qb = qb.andWhere('submission.emotion_level >= :minLevel', {
            minLevel: filters.minEmotionLevel,
          });
        }
        if (filters?.maxEmotionLevel !== undefined) {
          qb = qb.andWhere('submission.emotion_level <= :maxLevel', {
            maxLevel: filters.maxEmotionLevel,
          });
        }

        return qb;
      };

    // Executar todas as agregações em paralelo usando queries independentes
    const [
      totalSubmissions,
      averageResult,
      distributionByLevel,
      distributionByCategory,
      anonymityCount,
      trendData,
    ] = await Promise.all([
      // Total de submissões
      createBaseQuery().getCount(),

      // Média de nível de emoção
      createBaseQuery()
        .select('AVG(submission.emotion_level)', 'avg')
        .getRawOne<{ avg: string | null }>(),

      // Distribuição por nível
      createBaseQuery()
        .select('submission.emotion_level', 'level')
        .addSelect('COUNT(*)', 'count')
        .groupBy('submission.emotion_level')
        .getRawMany<{ level: number; count: string }>(),

      // Distribuição por categoria
      createBaseQuery()
        .select('submission.category_id', 'categoryId')
        .addSelect('COUNT(*)', 'count')
        .groupBy('submission.category_id')
        .getRawMany<{ categoryId: string; count: string }>(),

      // Contagem de anônimas vs identificadas
      createBaseQuery()
        .select('submission.is_anonymous', 'isAnonymous')
        .addSelect('COUNT(*)', 'count')
        .groupBy('submission.is_anonymous')
        .getRawMany<{ isAnonymous: boolean; count: string }>(),

      // Dados de tendência diária
      createBaseQuery()
        .select('DATE(submission.submitted_at)', 'date')
        .addSelect('AVG(submission.emotion_level)', 'avgLevel')
        .groupBy('DATE(submission.submitted_at)')
        .orderBy('DATE(submission.submitted_at)', 'ASC')
        .getRawMany<{ date: string; avgLevel: string }>(),
    ]);

    // Processar resultados
    const distributionByLevelMap: Record<number, number> = {};
    for (const row of distributionByLevel) {
      distributionByLevelMap[row.level] = parseInt(row.count, 10);
    }

    const distributionByCategoryMap: Record<string, number> = {};
    for (const row of distributionByCategory) {
      distributionByCategoryMap[row.categoryId] = parseInt(row.count, 10);
    }

    const anonymousRow = anonymityCount.find((row) => row.isAnonymous === true);
    const identifiedRow = anonymityCount.find(
      (row) => row.isAnonymous === false,
    );

    const processedTrendData: TrendDataPoint[] = trendData.map((row) => ({
      date: row.date,
      avgLevel: parseFloat(row.avgLevel),
    }));

    return {
      totalSubmissions,
      averageEmotionLevel: parseFloat(averageResult?.avg ?? '0'),
      distributionByLevel: distributionByLevelMap,
      distributionByCategory: distributionByCategoryMap,
      anonymousCount: parseInt(anonymousRow?.count ?? '0', 10),
      identifiedCount: parseInt(identifiedRow?.count ?? '0', 10),
      trendData: processedTrendData,
    };
  }

  /**
   * Encontrar submissões acima do limite de emoção (para alertas)
   */
  async findSubmissionsAboveThreshold(
    organizationId: string,
    threshold: number,
    since: Date,
  ): Promise<EmociogramaSubmissionEntity[]> {
    const schemas = await this.repository.find({
      where: {
        organizationId,
        emotionLevel: MoreThanOrEqual(threshold),
        submittedAt: MoreThanOrEqual(since),
        deletedAt: IsNull(),
      },
      order: { submittedAt: 'DESC' },
    });

    return schemas.map((s) => this.toDomain(s));
  }

  /**
   * Obter usuários mais motivados (menores níveis médios de emoção)
   *
   * Na escala do emociograma:
   * - Níveis 1-5: Emoções positivas (mais motivado)
   * - Níveis 6-10: Emoções negativas (menos motivado)
   */
  async getMostMotivated(
    organizationId: string,
    limit: number,
  ): Promise<UserMotivationScore[]> {
    const results = await this.repository
      .createQueryBuilder('submission')
      .select('submission.user_id', 'userId')
      .addSelect('AVG(submission.emotion_level)', 'avgLevel')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(submission.submitted_at)', 'lastSubmittedAt')
      .where('submission.organization_id = :organizationId', { organizationId })
      .andWhere('submission.deleted_at IS NULL')
      .groupBy('submission.user_id')
      .orderBy('avgLevel', 'ASC') // Menor nível = mais motivado
      .limit(limit)
      .getRawMany<{
        userId: string;
        avgLevel: string;
        count: string;
        lastSubmittedAt: Date;
      }>();

    return results.map((row) => ({
      userId: row.userId,
      averageEmotionLevel: parseFloat(row.avgLevel),
      submissionCount: parseInt(row.count, 10),
      lastSubmittedAt: new Date(row.lastSubmittedAt),
    }));
  }

  /**
   * Obter usuários menos motivados (maiores níveis médios de emoção)
   */
  async getLeastMotivated(
    organizationId: string,
    limit: number,
  ): Promise<UserMotivationScore[]> {
    const results = await this.repository
      .createQueryBuilder('submission')
      .select('submission.user_id', 'userId')
      .addSelect('AVG(submission.emotion_level)', 'avgLevel')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(submission.submitted_at)', 'lastSubmittedAt')
      .where('submission.organization_id = :organizationId', { organizationId })
      .andWhere('submission.deleted_at IS NULL')
      .groupBy('submission.user_id')
      .orderBy('avgLevel', 'DESC') // Maior nível = menos motivado
      .limit(limit)
      .getRawMany<{
        userId: string;
        avgLevel: string;
        count: string;
        lastSubmittedAt: Date;
      }>();

    return results.map((row) => ({
      userId: row.userId,
      averageEmotionLevel: parseFloat(row.avgLevel),
      submissionCount: parseInt(row.count, 10),
      lastSubmittedAt: new Date(row.lastSubmittedAt),
    }));
  }

  /**
   * Obter dados agregados por departamento
   */
  async getByDepartment(
    organizationId: string,
    department: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData> {
    return this.getAggregatedByTimeRange(
      organizationId,
      timeRange.startDate,
      timeRange.endDate,
      { department },
    );
  }

  /**
   * Obter dados agregados por equipe
   */
  async getByTeam(
    organizationId: string,
    team: string,
    timeRange: TimeRange,
  ): Promise<AggregatedData> {
    return this.getAggregatedByTimeRange(
      organizationId,
      timeRange.startDate,
      timeRange.endDate,
      { team },
    );
  }

  /**
   * Deletar todas as submissões do usuário (direito LGPD ao apagamento)
   *
   * Executa hard delete para remoção completa dos dados.
   */
  async deleteByUser(userId: string, organizationId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(EmociogramaSubmissionSchema)
      .where('user_id = :userId', { userId })
      .andWhere('organization_id = :organizationId', { organizationId })
      .execute();
  }

  /**
   * Anonimizar todas as submissões do usuário (anonimização de dados LGPD)
   *
   * Marca as submissões como anônimas e remove os comentários,
   * preservando os dados agregados para análise.
   */
  async anonymizeByUser(userId: string, organizationId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(EmociogramaSubmissionSchema)
      .set({
        isAnonymous: true,
        comment: null,
      })
      .where('user_id = :userId', { userId })
      .andWhere('organization_id = :organizationId', { organizationId })
      .execute();
  }
}
