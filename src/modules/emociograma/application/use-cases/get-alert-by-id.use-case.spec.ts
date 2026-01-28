import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetAlertByIdUseCase } from './get-alert-by-id.use-case';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

describe('GetAlertByIdUseCase', () => {
  let useCase: GetAlertByIdUseCase;
  let mockAlertRepository: jest.Mocked<IEmociogramaAlertRepository>;

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
    notifiedUsers: ['user-1', 'user-2'],
    notificationSentAt: new Date('2024-01-15T10:35:00Z'),
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
  } as EmociogramaAlertEntity;

  beforeEach(async () => {
    mockAlertRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      findUnresolved: jest.fn(),
      findByOrganization: jest.fn(),
      findBySubmission: jest.fn(),
      getStatistics: jest.fn(),
      findBySeverity: jest.fn(),
      countUnresolvedBySeverity: jest.fn(),
      findByDateRange: jest.fn(),
      bulkResolve: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAlertByIdUseCase,
        {
          provide: EMOCIOGRAMA_ALERT_REPOSITORY,
          useValue: mockAlertRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetAlertByIdUseCase>(GetAlertByIdUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return an alert when found and belongs to organization', async () => {
      mockAlertRepository.findById.mockResolvedValue(mockAlert);

      const result = await useCase.execute('alert-123', 'org-123');

      expect(result).toEqual(mockAlert);
      expect(mockAlertRepository.findById).toHaveBeenCalledWith('alert-123');
      expect(mockAlertRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when alert does not exist', async () => {
      mockAlertRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('alert-999', 'org-123')).rejects.toThrow(
        NotFoundException,
      );

      await expect(useCase.execute('alert-999', 'org-123')).rejects.toThrow(
        'Alerta com ID alert-999 não encontrado',
      );
    });

    it('should throw ForbiddenException when alert belongs to different organization', async () => {
      mockAlertRepository.findById.mockResolvedValue(mockAlert);

      await expect(useCase.execute('alert-123', 'other-org')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(useCase.execute('alert-123', 'other-org')).rejects.toThrow(
        'Você não tem permissão para acessar este alerta',
      );
    });

    it('should return resolved alert with resolution details', async () => {
      const resolvedAlert = {
        ...mockAlert,
        isResolved: true,
        resolvedAt: new Date('2024-01-15T14:00:00Z'),
        resolvedBy: 'user-manager',
        resolutionNotes: 'Conversei com o colaborador',
      } as EmociogramaAlertEntity;

      mockAlertRepository.findById.mockResolvedValue(resolvedAlert);

      const result = await useCase.execute('alert-123', 'org-123');

      expect(result.isResolved).toBe(true);
      expect(result.resolvedBy).toBe('user-manager');
      expect(result.resolutionNotes).toBe('Conversei com o colaborador');
    });
  });
});
