import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { PaginatedResult } from '../../../../core/domain/repositories/base.repository.interface';
import type { PaginationDto } from '../../../../core/application/dtos/pagination.dto';

/**
 * Caso de Uso: Obter Minhas Submissões
 *
 * Responsável por recuperar o histórico de submissões de emociograma
 * do próprio usuário autenticado, com suporte a paginação.
 *
 * Fluxo:
 * 1. Receber userId e organizationId do contexto de autenticação
 * 2. Aplicar parâmetros de paginação
 * 3. Buscar submissões do usuário na organização
 * 4. Retornar resultado paginado
 */
@Injectable()
export class GetMySubmissionsUseCase {
  private readonly logger = new Logger(GetMySubmissionsUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  /**
   * Executa a busca de submissões do usuário
   *
   * @param userId - ID do usuário autenticado
   * @param organizationId - ID da organização do usuário
   * @param pagination - Parâmetros de paginação (page, limit, sortBy, sortOrder)
   * @returns Resultado paginado com submissões do usuário
   */
  async execute(
    userId: string,
    organizationId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<EmociogramaSubmissionEntity>> {
    this.logger.log(
      `Buscando submissões do usuário ${userId} na organização ${organizationId}`,
    );

    const result = await this.submissionRepository.findByUser(
      userId,
      organizationId,
      {
        skip: pagination.skip,
        take: pagination.take,
      },
    );

    this.logger.log(
      `Encontradas ${result.total} submissões (página ${result.page} de ${result.totalPages})`,
    );

    return result;
  }
}
