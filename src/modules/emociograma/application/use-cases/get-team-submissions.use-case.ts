import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { MaskedSubmissionData } from '../../domain/entities/submission.entity';
import type { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';
import type { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

/**
 * Resultado paginado com submissões anonimizadas
 */
export interface AnonymizedPaginatedResult {
  data: MaskedSubmissionData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Caso de Uso: Obter Submissões da Equipe
 *
 * Responsável por recuperar submissões da organização/equipe
 * para gestores e admins. Pode retornar dados anonimizados
 * ou identificados dependendo do parâmetro.
 */
@Injectable()
export class GetTeamSubmissionsUseCase {
  private readonly logger = new Logger(GetTeamSubmissionsUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  /**
   * Executa a busca de submissões da equipe/organização
   *
   * @param organizationId - ID da organização
   * @param requesterId - ID do usuário que está solicitando
   * @param pagination - Parâmetros de paginação
   * @param anonymize - Se true, retorna dados mascarados
   * @param filters - Filtros opcionais (department, team)
   * @returns Resultado paginado com submissões
   */
  async execute(
    organizationId: string,
    requesterId: string,
    pagination: PaginationDto,
    anonymize: boolean = true,
    filters?: { department?: string; team?: string },
  ): Promise<
    | PaginatedResult<EmociogramaSubmissionEntity>
    | AnonymizedPaginatedResult
  > {
    this.logger.log(
      `Buscando submissões da organização ${organizationId} - anonymize: ${anonymize}`,
    );

    const result = await this.submissionRepository.findAll({
      skip: pagination.skip,
      take: pagination.take,
      where: {
        organizationId,
        ...(filters?.department && { department: filters.department }),
        ...(filters?.team && { team: filters.team }),
      },
      orderBy: { submittedAt: 'DESC' },
    });

    this.logger.log(
      `Encontradas ${result.total} submissões (página ${result.page} de ${result.totalPages})`,
    );

    if (anonymize) {
      return {
        data: result.data.map((submission) => submission.maskIdentity()),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    }

    return result;
  }
}
