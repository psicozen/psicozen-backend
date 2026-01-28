import { Test, TestingModule } from '@nestjs/testing';
import { ResolveAlertUseCase } from './resolve-alert.use-case';
import { ALERT_SERVICE } from '../services/alert.service.interface';
import type { IAlertService } from '../services/alert.service.interface';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

describe('ResolveAlertUseCase', () => {
  let useCase: ResolveAlertUseCase;
  let alertService: jest.Mocked<IAlertService>;

  const mockAlert = new EmociogramaAlertEntity({
    id: 'alert-123',
    organizationId: 'org-456',
    submissionId: 'sub-789',
    alertType: 'threshold_exceeded',
    severity: 'high',
    message: 'Test alert',
    isResolved: true,
    resolvedAt: new Date(),
    resolvedBy: 'user-001',
    resolutionNotes: 'Resolved via test',
    notifiedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockAlertService: jest.Mocked<IAlertService> = {
      triggerEmotionalAlert: jest.fn(),
      resolveAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveAlertUseCase,
        { provide: ALERT_SERVICE, useValue: mockAlertService },
      ],
    }).compile();

    useCase = module.get<ResolveAlertUseCase>(ResolveAlertUseCase);
    alertService = module.get(ALERT_SERVICE);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should resolve alert successfully', async () => {
      alertService.resolveAlert.mockResolvedValue(mockAlert);

      const result = await useCase.execute(
        'alert-123',
        'user-001',
        'Resolved via test',
      );

      expect(alertService.resolveAlert).toHaveBeenCalledWith(
        'alert-123',
        'user-001',
        'Resolved via test',
      );
      expect(result).toEqual(mockAlert);
      expect(result.isResolved).toBe(true);
    });

    it('should resolve alert without notes', async () => {
      alertService.resolveAlert.mockResolvedValue(mockAlert);

      await useCase.execute('alert-123', 'user-001');

      expect(alertService.resolveAlert).toHaveBeenCalledWith(
        'alert-123',
        'user-001',
        undefined,
      );
    });

    it('should propagate errors from alert service', async () => {
      alertService.resolveAlert.mockRejectedValue(
        new Error('Alert not found'),
      );

      await expect(
        useCase.execute('invalid-id', 'user-001'),
      ).rejects.toThrow('Alert not found');
    });
  });
});
