import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IAlertService } from './alert.service.interface';
import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import { Role } from '../../../roles/domain/enums/role.enum';

/**
 * Serviço responsável por disparar alertas emocionais
 *
 * Quando um colaborador submete um nível de emoção preocupante
 * (>= limite de alerta da organização), este serviço notifica
 * os gestores e administradores responsáveis.
 */
@Injectable()
export class AlertService implements IAlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Dispara um alerta emocional para gestores/administradores
   *
   * Este método é projetado para ser chamado assincronamente
   * (fire-and-forget) para não bloquear a resposta da submissão.
   *
   * Fluxo:
   * 1. Busca gestores e admins da organização
   * 2. Prepara dados do alerta (preservando anonimato se aplicável)
   * 3. Envia notificações (implementação futura: email, push, etc)
   *
   * @param submission - A submissão que disparou o alerta
   */
  async triggerEmotionalAlert(
    submission: EmociogramaSubmissionEntity,
  ): Promise<void> {
    try {
      this.logger.log(
        `Iniciando disparo de alerta para submissão ${submission.id} (nível: ${submission.emotionLevel})`,
      );

      // Buscar gestores e admins da organização
      const managers = await this.userRepository.findByRoles(
        submission.organizationId,
        [Role.GESTOR, Role.ADMIN],
      );

      if (managers.length === 0) {
        this.logger.warn(
          `Nenhum gestor/admin encontrado para organização ${submission.organizationId}`,
        );
        return;
      }

      // Preparar dados do alerta (respeitando anonimato)
      const alertData = this.prepareAlertData(submission);

      // TODO: Integrar com serviço de notificações (email, push, etc)
      // Por enquanto, apenas logamos o alerta
      this.logger.log(
        `Alerta emocional disparado para ${managers.length} gestor(es): ${JSON.stringify(alertData)}`,
      );

      // Futuro: Persistir alerta na base de dados
      // Futuro: Enviar email/notificação push

      this.logger.log(
        `Alerta processado com sucesso para submissão ${submission.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao disparar alerta para submissão ${submission.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Não relançar erro - este é um processo fire-and-forget
    }
  }

  /**
   * Prepara os dados do alerta respeitando o anonimato
   *
   * Se a submissão for anônima, não inclui o userId.
   * Sempre inclui department/team para contexto.
   */
  private prepareAlertData(submission: EmociogramaSubmissionEntity): {
    submissionId: string;
    organizationId: string;
    emotionLevel: number;
    emotionEmoji: string;
    isAnonymous: boolean;
    userId?: string;
    department?: string;
    team?: string;
    submittedAt: Date;
  } {
    return {
      submissionId: submission.id,
      organizationId: submission.organizationId,
      emotionLevel: submission.emotionLevel,
      emotionEmoji: submission.emotionEmoji,
      isAnonymous: submission.isAnonymous,
      userId: submission.isAnonymous ? undefined : submission.userId,
      department: submission.department,
      team: submission.team,
      submittedAt: submission.submittedAt,
    };
  }
}
