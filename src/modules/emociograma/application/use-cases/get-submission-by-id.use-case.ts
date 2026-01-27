import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import {
  EmociogramaSubmissionEntity,
  MaskedSubmissionData,
} from '../../domain/entities/submission.entity';
import { NotFoundException } from '../../../../core/domain/exceptions/not-found.exception';
import { Role } from '../../../roles/domain/enums/role.enum';

/**
 * Caso de Uso: Obter Submissão por ID
 *
 * Responsável por recuperar uma submissão específica de emociograma.
 * Implementa controle de acesso:
 * - COLABORADOR: Só pode ver suas próprias submissões
 * - GESTOR/ADMIN: Pode ver qualquer submissão da organização
 *
 * Para submissões anônimas de outros usuários, retorna dados mascarados.
 */
@Injectable()
export class GetSubmissionByIdUseCase {
  private readonly logger = new Logger(GetSubmissionByIdUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
  ) {}

  /**
   * Executa a busca de uma submissão específica
   *
   * @param submissionId - ID da submissão a ser buscada
   * @param userId - ID do usuário que está solicitando
   * @param organizationId - ID da organização do contexto
   * @param userRole - Role do usuário que está solicitando
   * @returns Submissão encontrada (mascarada se necessário)
   */
  async execute(
    submissionId: string,
    userId: string,
    organizationId: string,
    userRole?: Role,
  ): Promise<EmociogramaSubmissionEntity | MaskedSubmissionData> {
    this.logger.log(
      `Buscando submissão ${submissionId} para usuário ${userId}`,
    );

    const submission = await this.submissionRepository.findById(submissionId);

    if (!submission) {
      throw new NotFoundException('Submission', submissionId);
    }

    if (submission.organizationId !== organizationId) {
      this.logger.warn(
        `Tentativa de acesso a submissão de outra organização - userId: ${userId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta submissão',
      );
    }

    const isOwner = submission.userId === userId;
    const isManagerOrAdmin =
      userRole === Role.GESTOR ||
      userRole === Role.ADMIN ||
      userRole === Role.SUPER_ADMIN;

    if (!isOwner && !isManagerOrAdmin) {
      throw new ForbiddenException(
        'Você só pode visualizar suas próprias submissões',
      );
    }

    if (submission.isAnonymous && !isOwner) {
      this.logger.debug(`Retornando submissão mascarada (anônima)`);
      return submission.maskIdentity();
    }

    return submission;
  }
}
