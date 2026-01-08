import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'EMAIL_FROM') return 'noreply@psicozen.com';
        if (key === 'RESEND_API_KEY') return null; // Simula ambiente sem API key
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should return mock ID when Resend not configured', async () => {
      const params = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>',
        text: 'Test',
      };

      const result = await service.send(params);

      expect(result.id).toBe('mock-id');
    });

    it('should log warning when Resend not configured', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Resend not configured. Email not sent:',
        'test@example.com',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('sendMagicLink', () => {
    it('should send magic link email', async () => {
      const sendSpy = jest.spyOn(service, 'send').mockResolvedValue({ id: 'email-123' });

      await service.sendMagicLink('user@example.com', 'https://example.com/verify?token=abc');

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Your Magic Link - PsicoZen',
        }),
      );

      sendSpy.mockRestore();
    });

    it('should include link in email content', async () => {
      const sendSpy = jest.spyOn(service, 'send').mockResolvedValue({ id: 'email-123' });
      const link = 'https://example.com/verify?token=xyz';

      await service.sendMagicLink('user@example.com', link);

      const callArgs = sendSpy.mock.calls[0][0];
      expect(callArgs.html).toContain(link);
      expect(callArgs.text).toContain(link);

      sendSpy.mockRestore();
    });
  });

  describe('sendWelcome', () => {
    it('should send welcome email with first name', async () => {
      const sendSpy = jest.spyOn(service, 'send').mockResolvedValue({ id: 'email-123' });

      await service.sendWelcome('user@example.com', 'John');

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Welcome to PsicoZen!',
        }),
      );

      const callArgs = sendSpy.mock.calls[0][0];
      expect(callArgs.html).toContain('Welcome John!');

      sendSpy.mockRestore();
    });

    it('should send welcome email without first name', async () => {
      const sendSpy = jest.spyOn(service, 'send').mockResolvedValue({ id: 'email-123' });

      await service.sendWelcome('user@example.com');

      const callArgs = sendSpy.mock.calls[0][0];
      expect(callArgs.html).toContain('Welcome there!');

      sendSpy.mockRestore();
    });
  });
});
