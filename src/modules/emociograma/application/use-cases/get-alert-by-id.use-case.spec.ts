import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetAlertByIdUseCase } from './get-alert-by-id.use-case';
import { EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import type { IEmociogramaAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';

describe('GetAlertByIdUseCase', () => {
  let useCase: GetAlertByIdUseCase;
  let alertRepository: jest.Mocked<IEmociogramaAlertRepository>;

  const mockAlert = new EmociogramaAlertEntity({
    id: 'alert-123',
    organizationId: 'org-456',
    submissionId: 'sub-789',
    alertType: 'threshold_exceeded',
    severity: 'high',
    message: 'Test alert',
    isResolved: false,
    notifiedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IEmociogramaAlertRepository>> = {
      findById: jest.fn(),
      findByOrganization: jest.fn(),
      findUnresolved: jest.fn(),
      getStatistics: jest.fn(),
      findBySeverity: jest.fn(),
      countUnresolvedBySeverity: jest.fn(),
      findByDateRange: jest.fn(),
      bulkResolve: jest.fn(),
      findBySubmission: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAlertByIdUseCase,
        { provide: EMOCIOGRAMA_ALERT_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<GetAlertByIdUseCase>(GetAlertByIdUseCase);
    alertRepository = module.get(EMOCIOGRAMA_ALERT_REPOSITORY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return alert when found and belongs to organization', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);

      const result = await useCase.execute('alert-123', 'org-456');

      expect(alertRepository.findById).toHaveBeenCalledWith('alert-123');
      expect(result).toEqual(mockAlert);
    });

    it('should throw NotFoundException when alert not found', async () => {
      alertRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('invalid-id', 'org-456'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        useCase.execute('invalid-id', 'org-456'),
      ).rejects.toThrow('Alerta com ID invalid-id não encontrado');
    });

    it('should throw ForbiddenException when alert belongs to different organization', async () => {
      alertRepository.findById.mockResolvedValue(mockAlert);

      await expect(
        useCase.execute('alert-123', 'different-org'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        useCase.execute('alert-123', 'different-org'),
      ).rejects.toThrow('Você não tem permissão para acessar este alerta');
    });
  });
});
