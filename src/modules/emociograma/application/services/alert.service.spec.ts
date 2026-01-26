import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { AlertService } from './alert.service';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository.interface';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EmailService } from '../../../emails/infrastructure/services/email.service';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import { Role } from '../../../roles/domain/enums/role.enum';

describe('AlertService', () => {
  let service: AlertService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockAlertRepository: jest.Mocked<IEmociogramaAlertRepository>;
  let mockEmailService: jest.Mocked<EmailService>;

  const mockManagers = [
    { id: 'manager-1', email: 'gestor@org.com', firstName: 'Gestor' },
    { id: 'manager-2', email: 'admin@org.com', firstName: 'Admin' },
  ];

  const createMockSubmission = (
    overrides: Partial<EmociogramaSubmissionEntity> = {},
  ): EmociogramaSubmissionEntity => {
    const submission = new EmociogramaSubmissionEntity({
      id: 'submission-123',
      organizationId: 'org-123',
      userId: 'user-123',
      emotionLevel: 8,
      emotionEmoji: '😣',
      isAnonymous: false,
      submittedAt: new Date('2025-01-15T10:00:00Z'),
      department: 'TI',
      team: 'Backend',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
    return submission;
  };

  const createMockAlert = (
    overrides: Partial<EmociogramaAlertEntity> = {},
  ): EmociogramaAlertEntity => {
    return new EmociogramaAlertEntity({
      id: 'alert-123',
      organizationId: 'org-123',
      submissionId: 'submission-123',
      alertType: 'threshold_exceeded',
      severity: 'high',
      message: 'Colaborador reportou estado emocional Estressado 😣 (Nível 8/10). Equipe: Backend.',
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  beforeEach(async () => {
    mockUserRepository = {
      findByRoles: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findBySupabaseUserId: jest.fn(),
      existsByEmail: jest.fn(),
      getRolesByOrganization: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    mockAlertRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findUnresolved: jest.fn(),
      findByOrganization: jest.fn(),
      findBySubmission: jest.fn(),
      getStatistics: jest.fn(),
      findBySeverity: jest.fn(),
      countUnresolvedBySeverity: jest.fn(),
      findByDateRange: jest.fn(),
      bulkResolve: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<IEmociogramaAlertRepository>;

    mockEmailService = {
      send: jest.fn().mockResolvedValue({ id: 'email-123' }),
      sendMagicLink: jest.fn(),
      sendWelcome: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    // Spy on Logger to suppress logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: EMOCIOGRAMA_ALERT_REPOSITORY, useValue: mockAlertRepository },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerEmotionalAlert', () => {
    describe('successful alert creation', () => {
      it('should create alert and send email notifications', async () => {
        const submission = createMockSubmission();
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        const updatedAlert = createMockAlert({
          notifiedUsers: ['manager-1', 'manager-2'],
          notificationSentAt: new Date(),
        });
        mockAlertRepository.update.mockResolvedValue(updatedAlert);

        const result = await service.triggerEmotionalAlert(submission);

        expect(result).toBeDefined();
        expect(result?.id).toBe('alert-123');
        expect(mockUserRepository.findByRoles).toHaveBeenCalledWith(
          'org-123',
          [Role.GESTOR, Role.ADMIN],
        );
        expect(mockAlertRepository.create).toHaveBeenCalled();
        expect(mockEmailService.send).toHaveBeenCalledTimes(2);
        expect(mockAlertRepository.update).toHaveBeenCalled();
      });

      it('should send emails with correct severity prefix for critical alerts', async () => {
        const submission = createMockSubmission({ emotionLevel: 10, emotionEmoji: '😞' });
        const savedAlert = createMockAlert({ severity: 'critical' });

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: '[CRÍTICO] Alerta Emocional - PsicoZen',
          }),
        );
      });

      it('should send emails with correct severity prefix for high alerts', async () => {
        const submission = createMockSubmission({ emotionLevel: 8 });
        const savedAlert = createMockAlert({ severity: 'high' });

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: '[URGENTE] Alerta Emocional - PsicoZen',
          }),
        );
      });

      it('should send emails with correct severity prefix for medium alerts', async () => {
        const submission = createMockSubmission({ emotionLevel: 6 });
        const savedAlert = createMockAlert({ severity: 'medium' });

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: '[ATENÇÃO] Alerta Emocional - PsicoZen',
          }),
        );
      });

      it('should include comment in email when present', async () => {
        const submission = createMockSubmission({
          comment: 'Estou muito estressado com prazos',
        });
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            html: expect.stringContaining('Estou muito estressado com prazos'),
            text: expect.stringContaining('Estou muito estressado com prazos'),
          }),
        );
      });

      it('should use department when team is not available', async () => {
        const submission = createMockSubmission({
          team: undefined,
          department: 'Recursos Humanos',
        });
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            html: expect.stringContaining('Departamento: Recursos Humanos'),
          }),
        );
      });

      it('should show "Não especificada" when no location info', async () => {
        const submission = createMockSubmission({
          team: undefined,
          department: undefined,
        });
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            html: expect.stringContaining('Não especificada'),
          }),
        );
      });
    });

    describe('no managers found', () => {
      it('should return null when no managers are found', async () => {
        const submission = createMockSubmission();
        mockUserRepository.findByRoles.mockResolvedValue([]);

        const result = await service.triggerEmotionalAlert(submission);

        expect(result).toBeNull();
        expect(mockAlertRepository.create).not.toHaveBeenCalled();
        expect(mockEmailService.send).not.toHaveBeenCalled();
      });

      it('should log warning when no managers found', async () => {
        const submission = createMockSubmission();
        mockUserRepository.findByRoles.mockResolvedValue([]);

        await service.triggerEmotionalAlert(submission);

        expect(Logger.prototype.warn).toHaveBeenCalledWith(
          expect.stringContaining('Nenhum gestor/admin encontrado'),
        );
      });
    });

    describe('partial email failures', () => {
      it('should continue sending emails even if one fails', async () => {
        const submission = createMockSubmission();
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        // First email fails, second succeeds
        mockEmailService.send
          .mockRejectedValueOnce(new Error('SMTP error'))
          .mockResolvedValueOnce({ id: 'email-2' });

        const result = await service.triggerEmotionalAlert(submission);

        expect(result).toBeDefined();
        expect(mockEmailService.send).toHaveBeenCalledTimes(2);
        expect(mockAlertRepository.update).toHaveBeenCalled();
      });

      it('should only record successfully notified users', async () => {
        const submission = createMockSubmission();
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);

        // First email fails, second succeeds
        mockEmailService.send
          .mockRejectedValueOnce(new Error('SMTP error'))
          .mockResolvedValueOnce({ id: 'email-2' });

        // Capture the update call to verify notifiedUsers
        mockAlertRepository.update.mockImplementation(async (id, alert) => {
          expect(alert.notifiedUsers).toEqual(['manager-2']);
          return new EmociogramaAlertEntity({ ...savedAlert, ...alert });
        });

        await service.triggerEmotionalAlert(submission);

        expect(mockAlertRepository.update).toHaveBeenCalled();
      });

      it('should not call update if all emails fail', async () => {
        const submission = createMockSubmission();
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockEmailService.send.mockRejectedValue(new Error('SMTP error'));

        await service.triggerEmotionalAlert(submission);

        // Update should not be called because no one was notified
        expect(mockAlertRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('should return null on repository error and not throw', async () => {
        const submission = createMockSubmission();
        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockRejectedValue(new Error('DB error'));

        const result = await service.triggerEmotionalAlert(submission);

        expect(result).toBeNull();
        expect(Logger.prototype.error).toHaveBeenCalled();
      });

      it('should log the error message', async () => {
        const submission = createMockSubmission();
        mockUserRepository.findByRoles.mockRejectedValue(
          new Error('Connection timeout'),
        );

        await service.triggerEmotionalAlert(submission);

        expect(Logger.prototype.error).toHaveBeenCalledWith(
          expect.stringContaining('Connection timeout'),
          expect.any(String),
        );
      });
    });

    describe('anonymous submissions', () => {
      it('should handle anonymous submissions correctly', async () => {
        const submission = createMockSubmission({
          isAnonymous: true,
          userId: 'user-123',
        });
        const savedAlert = createMockAlert();

        mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            html: expect.stringContaining('Sim'),
          }),
        );
      });
    });
  });

  describe('resolveAlert', () => {
    describe('successful resolution', () => {
      it('should resolve an alert', async () => {
        const alert = createMockAlert();
        const resolvedAlert = createMockAlert({
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: 'admin-123',
          resolutionNotes: 'Contacted the employee',
        });

        mockAlertRepository.findById.mockResolvedValue(alert);
        mockAlertRepository.update.mockResolvedValue(resolvedAlert);

        const result = await service.resolveAlert(
          'alert-123',
          'admin-123',
          'Contacted the employee',
        );

        expect(result.isResolved).toBe(true);
        expect(result.resolvedBy).toBe('admin-123');
        expect(mockAlertRepository.update).toHaveBeenCalled();
      });

      it('should resolve alert without notes', async () => {
        const alert = createMockAlert();
        const resolvedAlert = createMockAlert({
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: 'admin-123',
        });

        mockAlertRepository.findById.mockResolvedValue(alert);
        mockAlertRepository.update.mockResolvedValue(resolvedAlert);

        const result = await service.resolveAlert('alert-123', 'admin-123');

        expect(result.isResolved).toBe(true);
        expect(mockAlertRepository.update).toHaveBeenCalled();
      });

      it('should log resolution details', async () => {
        const alert = createMockAlert();
        mockAlertRepository.findById.mockResolvedValue(alert);
        mockAlertRepository.update.mockResolvedValue(
          createMockAlert({ isResolved: true }),
        );

        await service.resolveAlert('alert-123', 'admin-123', 'Notes here');

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('resolvido por usuário admin-123'),
        );
        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining('Notes here'),
        );
      });
    });

    describe('alert not found', () => {
      it('should throw NotFoundException when alert does not exist', async () => {
        mockAlertRepository.findById.mockResolvedValue(null);

        await expect(
          service.resolveAlert('non-existent', 'admin-123'),
        ).rejects.toThrow(NotFoundException);

        await expect(
          service.resolveAlert('non-existent', 'admin-123'),
        ).rejects.toThrow('Alerta com ID non-existent não encontrado');
      });
    });

    describe('already resolved', () => {
      it('should throw ConflictException when alert is already resolved', async () => {
        const resolvedAlert = createMockAlert({
          isResolved: true,
          resolvedAt: new Date('2025-01-15T12:00:00Z'),
          resolvedBy: 'other-admin',
        });

        mockAlertRepository.findById.mockResolvedValue(resolvedAlert);

        await expect(
          service.resolveAlert('alert-123', 'admin-123'),
        ).rejects.toThrow(ConflictException);

        await expect(
          service.resolveAlert('alert-123', 'admin-123'),
        ).rejects.toThrow('já foi resolvido');
      });
    });
  });

  describe('email content generation', () => {
    it('should generate HTML with correct severity colors', async () => {
      const testCases = [
        { severity: 'critical', color: '#dc2626' },
        { severity: 'high', color: '#ea580c' },
        { severity: 'medium', color: '#ca8a04' },
        { severity: 'low', color: '#65a30d' },
      ];

      for (const { severity, color } of testCases) {
        const submission = createMockSubmission();
        const savedAlert = createMockAlert({ severity: severity as any });

        mockUserRepository.findByRoles.mockResolvedValue([mockManagers[0]] as any);
        mockAlertRepository.create.mockResolvedValue(savedAlert);
        mockAlertRepository.update.mockResolvedValue(savedAlert);

        await service.triggerEmotionalAlert(submission);

        expect(mockEmailService.send).toHaveBeenCalledWith(
          expect.objectContaining({
            html: expect.stringContaining(color),
          }),
        );

        jest.clearAllMocks();
      }
    });

    it('should generate text email with all required information', async () => {
      const submission = createMockSubmission({
        comment: 'Test comment',
      });
      const savedAlert = createMockAlert();

      mockUserRepository.findByRoles.mockResolvedValue([mockManagers[0]] as any);
      mockAlertRepository.create.mockResolvedValue(savedAlert);
      mockAlertRepository.update.mockResolvedValue(savedAlert);

      await service.triggerEmotionalAlert(submission);

      const emailCall = mockEmailService.send.mock.calls[0][0];

      expect(emailCall.text).toContain('ALERTA EMOCIONAL');
      expect(emailCall.text).toContain('Nível Emocional:');
      expect(emailCall.text).toContain('Localização:');
      expect(emailCall.text).toContain('Data/Hora:');
      expect(emailCall.text).toContain('Anônimo:');
      expect(emailCall.text).toContain('Test comment');
      expect(emailCall.text).toContain('PsicoZen');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: create alert, send notifications, record sent', async () => {
      const submission = createMockSubmission({
        emotionLevel: 9,
        emotionEmoji: '😟',
        comment: 'Feeling very anxious about the project deadline',
      });

      const createdAlert = createMockAlert({
        severity: 'critical',
      });

      mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
      mockAlertRepository.create.mockResolvedValue(createdAlert);
      mockAlertRepository.update.mockImplementation(async (id, alert) => {
        return new EmociogramaAlertEntity({
          ...createdAlert,
          ...alert,
          notifiedUsers: ['manager-1', 'manager-2'],
          notificationSentAt: new Date(),
        });
      });

      const result = await service.triggerEmotionalAlert(submission);

      // Verify complete flow
      expect(mockUserRepository.findByRoles).toHaveBeenCalledTimes(1);
      expect(mockAlertRepository.create).toHaveBeenCalledTimes(1);
      expect(mockEmailService.send).toHaveBeenCalledTimes(2);
      expect(mockAlertRepository.update).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should handle submission with minimal data', async () => {
      const submission = new EmociogramaSubmissionEntity({
        id: 'submission-minimal',
        organizationId: 'org-123',
        userId: 'user-123',
        emotionLevel: 7,
        emotionEmoji: '😢',
        isAnonymous: true,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedAlert = createMockAlert();

      mockUserRepository.findByRoles.mockResolvedValue(mockManagers as any);
      mockAlertRepository.create.mockResolvedValue(savedAlert);
      mockAlertRepository.update.mockResolvedValue(savedAlert);

      const result = await service.triggerEmotionalAlert(submission);

      expect(result).toBeDefined();
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Não especificada'),
        }),
      );
    });
  });
});
