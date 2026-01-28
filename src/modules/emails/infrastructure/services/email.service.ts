import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(params: SendEmailParams): Promise<{ id: string }> {
    if (!this.resend) {
      this.logger.warn(`Resend not configured. Email not sent: ${params.to}`);
      return { id: 'mock-id' };
    }

    const from = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@example.com',
    );

    const { data, error } = await this.resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { id: data.id };
  }

  async sendMagicLink(email: string, link: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your Magic Link - PsicoZen',
      html: `
        <h1>Welcome to PsicoZen!</h1>
        <p>Click the link below to sign in:</p>
        <a href="${link}">Sign In</a>
        <p>This link will expire in 15 minutes.</p>
      `,
      text: `Welcome to PsicoZen! Click here to sign in: ${link}`,
    });
  }

  async sendWelcome(email: string, firstName?: string): Promise<void> {
    const name = firstName || 'there';
    await this.send({
      to: email,
      subject: 'Welcome to PsicoZen!',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Thank you for joining PsicoZen.</p>
        <p>We're excited to have you on board!</p>
      `,
      text: `Welcome ${name}! Thank you for joining PsicoZen.`,
    });
  }

  /**
   * Enviar email de confirmação para exclusão de dados (LGPD Art. 18, VI)
   *
   * @param email - Email do usuário
   * @param userId - ID do usuário
   * @param organizationId - ID da organização
   */
  async sendDataDeletionConfirmation(
    email: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    // Token de confirmação (expira em 24h)
    const confirmationToken = Buffer.from(
      JSON.stringify({
        userId,
        organizationId,
        action: 'data_deletion',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }),
    ).toString('base64url');

    const confirmationLink = `${frontendUrl}/lgpd/confirm-deletion?token=${confirmationToken}`;

    await this.send({
      to: email,
      subject: 'Confirmação de Exclusão de Dados - PsicoZen',
      html: `
        <h1>Solicitação de Exclusão de Dados</h1>
        <p>Recebemos sua solicitação para excluir permanentemente seus dados pessoais.</p>
        <p><strong>ATENÇÃO:</strong> Esta ação é <strong>irreversível</strong>. Todos os seus dados serão permanentemente excluídos.</p>
        <p>Se você realmente deseja excluir seus dados, clique no link abaixo:</p>
        <p><a href="${confirmationLink}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Confirmar Exclusão</a></p>
        <p>Este link expira em 24 horas.</p>
        <p>Se você não solicitou esta exclusão, ignore este email.</p>
        <hr>
        <p><small>Esta solicitação foi feita em conformidade com a Lei Geral de Proteção de Dados (LGPD) - Artigo 18, VI.</small></p>
      `,
      text: `
        Solicitação de Exclusão de Dados

        Recebemos sua solicitação para excluir permanentemente seus dados pessoais.

        ATENÇÃO: Esta ação é IRREVERSÍVEL. Todos os seus dados serão permanentemente excluídos.

        Para confirmar a exclusão, acesse: ${confirmationLink}

        Este link expira em 24 horas.

        Se você não solicitou esta exclusão, ignore este email.

        LGPD - Artigo 18, VI
      `,
    });

    this.logger.log(`Data deletion confirmation email sent to: ${email}`);
  }
}
