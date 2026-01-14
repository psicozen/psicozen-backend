import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { IOrganizationRepository } from '../../../organizations/domain/repositories/organization.repository.interface';
import { ORGANIZATION_REPOSITORY } from '../../../organizations/domain/repositories/organization.repository.interface';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import {
  EmociogramaSubmissionEntity,
  MaskedSubmissionData,
} from '../../domain/entities/submission.entity';
import { SubmitEmociogramaDto } from '../dtos/submit-emociograma.dto';
import { CommentModerationService } from '../services/comment-moderation.service';
import type { IAlertService } from '../services/alert.service.interface';
import { ALERT_SERVICE } from '../services/alert.service.interface';
import { NotFoundException } from '../../../../core/domain/exceptions/not-found.exception';

/**
 * Caso de Uso: Submeter Emociograma
 *
 * Responsável por processar a submissão de um registro de estado emocional
 * de um colaborador. Inclui validações, moderação de comentários e
 * disparo de alertas quando necessário.
 *
 * Fluxo:
 * 1. Validar organização e configurações
 * 2. Validar usuário
 * 3. Moderar comentário (se presente)
 * 4. Criar entidade de submissão
 * 5. Persistir submissão
 * 6. Disparar alerta (assíncrono) se emoção >= limite
 * 7. Retornar dados mascarados se anônimo
 */
@Injectable()
export class SubmitEmociogramaUseCase {
  private readonly logger = new Logger(SubmitEmociogramaUseCase.name);

  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly moderationService: CommentModerationService,
    @Inject(ALERT_SERVICE)
    private readonly alertService: IAlertService,
  ) {}

  /**
   * Executa a submissão de um emociograma
   *
   * @param dto - Dados da submissão
   * @param userId - ID do usuário que está submetendo
   * @param organizationId - ID da organização do usuário
   * @returns Submissão criada (mascarada se anônima)
   * @throws ForbiddenException - Se emociograma estiver desabilitado
   * @throws NotFoundException - Se organização ou usuário não existir
   */
  async execute(
    dto: SubmitEmociogramaDto,
    userId: string,
    organizationId: string,
  ): Promise<EmociogramaSubmissionEntity | MaskedSubmissionData> {
    this.logger.log(
      `Processando submissão de emociograma - userId: ${userId}, orgId: ${organizationId}`,
    );

    // 1. Validar configurações da organização
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization', organizationId);
    }

    if (!organization.settings.emociogramaEnabled) {
      throw new ForbiddenException(
        'Emociograma está desabilitado para esta organização',
      );
    }

    // 2. Validar que o usuário existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User', userId);
    }

    // 3. Moderar comentário se presente
    let sanitizedComment = dto.comment;
    let shouldFlagComment = false;

    if (dto.comment) {
      const moderation = this.moderationService.moderateComment(dto.comment);
      sanitizedComment = moderation.sanitizedComment;
      shouldFlagComment = moderation.isFlagged;

      if (moderation.isFlagged) {
        this.logger.warn(
          `Comentário sinalizado para revisão - userId: ${userId}, motivos: ${moderation.flagReasons?.join(', ')}`,
        );
      }
    }

    // 4. Criar entidade de submissão
    const submission = EmociogramaSubmissionEntity.create({
      organizationId,
      userId,
      emotionLevel: dto.emotionLevel,
      categoryId: dto.categoryId,
      isAnonymous: dto.isAnonymous,
      comment: sanitizedComment,
      department: dto.department, // Do DTO (enviado pelo frontend)
      team: dto.team, // Do DTO (enviado pelo frontend)
    });

    // 5. Sinalizar comentário se foi moderado
    if (shouldFlagComment) {
      submission.flagComment();
    }

    // 6. Persistir submissão
    const saved = await this.submissionRepository.create(submission);
    this.logger.log(`Submissão persistida com ID: ${saved.id}`);

    // 7. Verificar disparo de alerta (async - não bloquear resposta)
    if (saved.shouldTriggerAlert()) {
      // Fire and forget - não bloqueia a resposta
      this.alertService.triggerEmotionalAlert(saved).catch((error) => {
        this.logger.error(
          `Falha ao disparar alerta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        );
      });
    }

    // 8. Retornar mascarado se anônimo
    if (dto.isAnonymous) {
      this.logger.debug(
        `Retornando submissão mascarada (anônima) - ID: ${saved.id}`,
      );
      return saved.maskIdentity();
    }

    return saved;
  }
}
