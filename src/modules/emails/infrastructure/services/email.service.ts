import { Injectable } from '@nestjs/common';
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
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(params: SendEmailParams): Promise<{ id: string }> {
    if (!this.resend) {
      console.warn('Resend not configured. Email not sent:', params.to);
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
}
