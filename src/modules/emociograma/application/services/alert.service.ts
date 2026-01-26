import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IAlertService } from './alert.service.interface';
import type { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import { EmailService } from '../../../emails/infrastructure/services/email.service';
import { Role } from '../../../roles/domain/enums/role.enum';

/**
 * Serviço responsável por disparar e gerenciar alertas emocionais
 *
 * Quando um colaborador submete um nível de emoção preocupante
 * (>= limite de alerta da organização), este serviço:
 * 1. Persiste o alerta no banco de dados
 * 2. Notifica gestores e administradores por email
 * 3. Permite resolver alertas com notas de acompanhamento
 */
@Injectable()
export class AlertService implements IAlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EMOCIOGRAMA_ALERT_REPOSITORY)
    private readonly alertRepository: IEmociogramaAlertRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Dispara um alerta emocional para gestores/administradores
   *
   * Este método é projetado para ser chamado assincronamente
   * (fire-and-forget) para não bloquear a resposta da submissão.
   *
   * Fluxo:
   * 1. Busca gestores e admins da organização
   * 2. Cria o alerta a partir da submissão
   * 3. Persiste o alerta no banco de dados
   * 4. Envia notificações por email
   * 5. Registra as notificações enviadas
   *
   * @param submission - A submissão que disparou o alerta
   * @returns O alerta criado ou null se não houver gestores para notificar
   */
  async triggerEmotionalAlert(
    submission: EmociogramaSubmissionEntity,
  ): Promise<EmociogramaAlertEntity | null> {
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
        return null;
      }

      // Criar alerta a partir da submissão
      const alert = EmociogramaAlertEntity.fromSubmission(submission);

      // Persistir alerta no banco de dados
      const savedAlert = await this.alertRepository.create(alert);

      this.logger.log(
        `Alerta ${savedAlert.id} criado com severidade ${savedAlert.severity}`,
      );

      // Enviar notificações por email
      const notifiedUserIds = await this.sendEmailNotifications(
        savedAlert,
        managers,
        submission,
      );

      // Registrar as notificações enviadas
      if (notifiedUserIds.length > 0) {
        savedAlert.recordNotification(notifiedUserIds);
        await this.alertRepository.update(savedAlert.id, savedAlert);
      }

      this.logger.log(
        `Alerta processado com sucesso para submissão ${submission.id}. Notificados: ${notifiedUserIds.length} gestor(es)`,
      );

      return savedAlert;
    } catch (error) {
      this.logger.error(
        `Erro ao disparar alerta para submissão ${submission.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Não relançar erro - este é um processo fire-and-forget
      return null;
    }
  }

  /**
   * Resolve um alerta existente
   *
   * Marca o alerta como resolvido, registrando quem resolveu
   * e opcionalmente notas sobre a resolução.
   *
   * @param alertId - ID do alerta a ser resolvido
   * @param resolvedBy - ID do usuário que está resolvendo o alerta
   * @param notes - Notas opcionais sobre a resolução
   * @returns O alerta atualizado
   * @throws NotFoundException - Se o alerta não for encontrado
   * @throws ConflictException - Se o alerta já foi resolvido
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<EmociogramaAlertEntity> {
    const alert = await this.alertRepository.findById(alertId);

    if (!alert) {
      throw new NotFoundException(`Alerta com ID ${alertId} não encontrado`);
    }

    if (alert.isResolved) {
      throw new ConflictException(
        `Alerta ${alertId} já foi resolvido em ${alert.resolvedAt?.toISOString()}`,
      );
    }

    alert.resolve(resolvedBy, notes);
    const updatedAlert = await this.alertRepository.update(alertId, alert);

    this.logger.log(
      `Alerta ${alertId} resolvido por usuário ${resolvedBy}. Notas: ${notes || 'N/A'}`,
    );

    return updatedAlert;
  }

  /**
   * Envia notificações por email para gestores/admins
   *
   * @param alert - O alerta criado
   * @param managers - Lista de gestores/admins a notificar
   * @param submission - A submissão que gerou o alerta
   * @returns Lista de IDs dos usuários notificados com sucesso
   */
  private async sendEmailNotifications(
    alert: EmociogramaAlertEntity,
    managers: Array<{ id: string; email: string; firstName?: string }>,
    submission: EmociogramaSubmissionEntity,
  ): Promise<string[]> {
    const notifiedUserIds: string[] = [];
    const emailSubject = this.getEmailSubject(alert);
    const emailHtml = this.generateEmailHtml(alert, submission);
    const emailText = this.generateEmailText(alert, submission);

    for (const manager of managers) {
      try {
        await this.emailService.send({
          to: manager.email,
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
        });
        notifiedUserIds.push(manager.id);
        this.logger.debug(`Email enviado para ${manager.email}`);
      } catch (error) {
        this.logger.error(
          `Falha ao enviar email para ${manager.email}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        );
        // Continue tentando os próximos managers
      }
    }

    return notifiedUserIds;
  }

  /**
   * Gera o assunto do email baseado na severidade do alerta
   */
  private getEmailSubject(alert: EmociogramaAlertEntity): string {
    const severityLabels: Record<string, string> = {
      critical: '[CRÍTICO] ',
      high: '[URGENTE] ',
      medium: '[ATENÇÃO] ',
      low: '',
    };

    const prefix = severityLabels[alert.severity] || '';
    return `${prefix}Alerta Emocional - PsicoZen`;
  }

  /**
   * Gera o conteúdo HTML do email de notificação
   */
  private generateEmailHtml(
    alert: EmociogramaAlertEntity,
    submission: EmociogramaSubmissionEntity,
  ): string {
    const severityColors: Record<string, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#65a30d',
    };

    const severityLabels: Record<string, string> = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Médio',
      low: 'Baixo',
    };

    const color = severityColors[alert.severity] || '#6b7280';
    const label = severityLabels[alert.severity] || 'Indefinido';

    // Determinar localização
    let location = 'Não especificada';
    if (submission.team) {
      location = `Equipe: ${submission.team}`;
    } else if (submission.department) {
      location = `Departamento: ${submission.department}`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Alerta Emocional - PsicoZen</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${color}; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Alerta Emocional - Severidade ${label}</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">${alert.message}</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Nível Emocional:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${submission.emotionLevel}/10 ${submission.emotionEmoji}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Localização:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Data/Hora:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${submission.submittedAt.toLocaleString('pt-BR')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Anônimo:</strong></td>
              <td style="padding: 8px 0;">${submission.isAnonymous ? 'Sim' : 'Não'}</td>
            </tr>
          </table>

          ${
            submission.comment
              ? `
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <strong>Comentário do colaborador:</strong>
            <p style="margin: 10px 0 0 0; font-style: italic;">"${submission.comment}"</p>
          </div>
          `
              : ''
          }

          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            Acesse o painel do PsicoZen para mais detalhes e para marcar este alerta como resolvido.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          Este email foi enviado automaticamente pelo sistema PsicoZen.
        </p>
      </body>
      </html>
    `;
  }

  /**
   * Gera o conteúdo texto do email de notificação
   */
  private generateEmailText(
    alert: EmociogramaAlertEntity,
    submission: EmociogramaSubmissionEntity,
  ): string {
    const severityLabels: Record<string, string> = {
      critical: 'CRÍTICO',
      high: 'ALTO',
      medium: 'MÉDIO',
      low: 'BAIXO',
    };

    const label = severityLabels[alert.severity] || 'INDEFINIDO';

    let location = 'Não especificada';
    if (submission.team) {
      location = `Equipe: ${submission.team}`;
    } else if (submission.department) {
      location = `Departamento: ${submission.department}`;
    }

    let text = `ALERTA EMOCIONAL - SEVERIDADE ${label}\n\n`;
    text += `${alert.message}\n\n`;
    text += `Nível Emocional: ${submission.emotionLevel}/10 ${submission.emotionEmoji}\n`;
    text += `Localização: ${location}\n`;
    text += `Data/Hora: ${submission.submittedAt.toLocaleString('pt-BR')}\n`;
    text += `Anônimo: ${submission.isAnonymous ? 'Sim' : 'Não'}\n`;

    if (submission.comment) {
      text += `\nComentário do colaborador:\n"${submission.comment}"\n`;
    }

    text += '\nAcesse o painel do PsicoZen para mais detalhes.\n';
    text += '\n---\nEste email foi enviado automaticamente pelo sistema PsicoZen.';

    return text;
  }
}
