import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
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
 *
 * Fluxo:
 * 1. Buscar submissão pelo ID
 * 2. Verificar se existe
 * 3. Verificar permissões de acesso
 * 4. Retornar dados (mascarados se anônimo e não é o próprio usuário)
 */
@Injectable()
export class GetSubmissionByIdUseCase {
  private readonly logger = new Logger(GetSubmissionByIdUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Executa a busca de uma submissão específica
   *
   * @param submissionId - ID da submissão a ser buscada
   * @param userId - ID do usuário que está solicitando
   * @param organizationId - ID da organização do contexto
   * @param userRole - Role do usuário que está solicitando
   * @returns Submissão encontrada (mascarada se necessário)
   * @throws NotFoundException - Se a submissão não existir
   * @throws ForbiddenException - Se o usuário não tiver permissão
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

    // 1. Buscar submissão
    const submission = await this.submissionRepository.findById(submissionId);

    if (!submission) {
      throw new NotFoundException('Submission', submissionId);
    }

    // 2. Verificar se pertence à mesma organização
    if (submission.organizationId !== organizationId) {
      this.logger.warn(
        `Tentativa de acesso a submissão de outra organização - userId: ${userId}, submissionId: ${submissionId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta submissão',
      );
    }

    // 3. Verificar permissões de acesso
    const isOwner = submission.userId === userId;
    const isManagerOrAdmin =
      userRole === Role.GESTOR ||
      userRole === Role.ADMIN ||
      userRole === Role.SUPER_ADMIN;

    // Colaborador só pode ver suas próprias submissões
    if (!isOwner && !isManagerOrAdmin) {
      this.logger.warn(
        `Acesso negado - colaborador tentando ver submissão de outro usuário - userId: ${userId}, submissionId: ${submissionId}`,
      );
      throw new ForbiddenException(
        'Você só pode visualizar suas próprias submissões',
      );
    }

    // 4. Se é anônimo e não é o próprio usuário, mascarar dados
    if (submission.isAnonymous && !isOwner) {
      this.logger.debug(
        `Retornando submissão mascarada (anônima de outro usuário) - ID: ${submissionId}`,
      );
      return submission.maskIdentity();
    }

    return submission;
  }
}
