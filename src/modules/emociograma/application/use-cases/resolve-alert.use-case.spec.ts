import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ResolveAlertUseCase } from './resolve-alert.use-case';
import type { IAlertService } from '../services/alert.service.interface';
import { ALERT_SERVICE } from '../services/alert.service.interface';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

describe('ResolveAlertUseCase', () => {
  let useCase: ResolveAlertUseCase;
  let mockAlertService: jest.Mocked<IAlertService>;

  const mockAlert = {
    id: 'alert-123',
    organizationId: 'org-123',
    submissionId: 'submission-123',
    alertType: 'threshold_exceeded' as const,
    severity: 'high' as const,
    message: 'Test alert message',
    isResolved: false,
    resolvedAt: undefined,
    resolvedBy: undefined,
    resolutionNotes: undefined,
    notifiedUsers: [],
    notificationSentAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as EmociogramaAlertEntity;

  const resolvedAlert = {
    ...mockAlert,
    isResolved: true,
    resolvedAt: new Date(),
    resolvedBy: 'user-123',
    resolutionNotes: 'Conversei com o colaborador',
  } as EmociogramaAlertEntity;

  beforeEach(async () => {
    mockAlertService = {
      triggerEmotionalAlert: jest.fn(),
      resolveAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveAlertUseCase,
        {
          provide: ALERT_SERVICE,
          useValue: mockAlertService,
        },
      ],
    }).compile();

    useCase = module.get<ResolveAlertUseCase>(ResolveAlertUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should resolve an alert successfully', async () => {
      mockAlertService.resolveAlert.mockResolvedValue(resolvedAlert);

      const result = await useCase.execute(
        'alert-123',
        'user-123',
        'Conversei com o colaborador',
      );

      expect(result).toEqual(resolvedAlert);
      expect(mockAlertService.resolveAlert).toHaveBeenCalledWith(
        'alert-123',
        'user-123',
        'Conversei com o colaborador',
      );
      expect(mockAlertService.resolveAlert).toHaveBeenCalledTimes(1);
    });

    it('should resolve an alert without notes', async () => {
      const resolvedWithoutNotes = {
        ...resolvedAlert,
        resolutionNotes: undefined,
      } as EmociogramaAlertEntity;

      mockAlertService.resolveAlert.mockResolvedValue(resolvedWithoutNotes);

      const result = await useCase.execute('alert-123', 'user-123');

      expect(result.resolutionNotes).toBeUndefined();
      expect(mockAlertService.resolveAlert).toHaveBeenCalledWith(
        'alert-123',
        'user-123',
        undefined,
      );
    });

    it('should throw NotFoundException when alert does not exist', async () => {
      mockAlertService.resolveAlert.mockRejectedValue(
        new NotFoundException('Alerta com ID alert-999 não encontrado'),
      );

      await expect(
        useCase.execute('alert-999', 'user-123', 'Notes'),
      ).rejects.toThrow(NotFoundException);

      expect(mockAlertService.resolveAlert).toHaveBeenCalledWith(
        'alert-999',
        'user-123',
        'Notes',
      );
    });

    it('should throw ConflictException when alert is already resolved', async () => {
      mockAlertService.resolveAlert.mockRejectedValue(
        new ConflictException('Alerta alert-123 já foi resolvido'),
      );

      await expect(
        useCase.execute('alert-123', 'user-123', 'Notes'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
