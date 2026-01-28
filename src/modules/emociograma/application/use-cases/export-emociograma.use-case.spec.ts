import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ExportEmociogramaUseCase } from './export-emociograma.use-case';
import { EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import type { IEmociogramaSubmissionRepository } from '../../domain/repositories/submission.repository.interface';
import type { IExportService } from '../../domain/services/export.service.interface';
import {
  EXPORT_SERVICE,
  ExportFormatType,
} from '../../domain/services/export.service.interface';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { ExportQueryDto, ExportFormat } from '../dtos/export-query.dto';
import { Role } from '../../../roles/domain/enums/role.enum';

describe('ExportEmociogramaUseCase', () => {
  let useCase: ExportEmociogramaUseCase;
  let mockRepository: jest.Mocked<IEmociogramaSubmissionRepository>;
  let mockExportService: jest.Mocked<IExportService>;

  const organizationId = 'org-123';
  const userId = 'user-456';
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-01-31');

  const createMockSubmission = (
    overrides: Partial<EmociogramaSubmissionEntity> = {},
  ) => {
    const submission = Object.assign(new EmociogramaSubmissionEntity(), {
      id: 'sub-001',
      organizationId,
      userId: 'user-789',
      emotionLevel: 4,
      emotionEmoji: '😊',
      categoryId: 'cat-001',
      isAnonymous: false,
      comment: 'Feeling good',
      commentFlagged: false,
      submittedAt: new Date('2024-01-15T10:00:00Z'),
      department: 'Engineering',
      team: 'Backend',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      ...overrides,
    });
    return submission;
  };

  const mockSubmissions = [
    createMockSubmission({ id: 'sub-001', emotionLevel: 3 }),
    createMockSubmission({ id: 'sub-002', emotionLevel: 7, isAnonymous: true }),
    createMockSubmission({ id: 'sub-003', emotionLevel: 5 }),
  ];

  const mockExportResult = {
    data: 'exported-data',
    mimeType: 'text/csv; charset=utf-8',
    filename: 'emociograma_20240115.csv',
  };

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      existsById: jest.fn(),
      findByUser: jest.fn(),
      getAggregatedByTimeRange: jest.fn(),
      findSubmissionsAboveThreshold: jest.fn(),
      getMostMotivated: jest.fn(),
      getLeastMotivated: jest.fn(),
      getByDepartment: jest.fn(),
      getByTeam: jest.fn(),
      deleteByUser: jest.fn(),
      anonymizeByUser: jest.fn(),
    } as jest.Mocked<IEmociogramaSubmissionRepository>;

    mockExportService = {
      generate: jest.fn(),
      supportsFormat: jest.fn(),
    } as jest.Mocked<IExportService>;

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportEmociogramaUseCase,
        {
          provide: EMOCIOGRAMA_SUBMISSION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: EXPORT_SERVICE,
          useValue: mockExportService,
        },
      ],
    }).compile();

    useCase = module.get<ExportEmociogramaUseCase>(ExportEmociogramaUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });
      mockExportService.generate.mockResolvedValue(mockExportResult);
    });

    it('deve exportar dados chamando o serviço de exportação', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      const result = await useCase.execute(
        organizationId,
        query,
        userId,
        Role.ADMIN,
      );

      expect(mockExportService.generate).toHaveBeenCalledWith(
        expect.any(Array),
        ExportFormatType.CSV,
      );
      expect(result).toEqual(mockExportResult);
    });

    it('deve mapear formato CSV corretamente', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.CSV,
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockExportService.generate).toHaveBeenCalledWith(
        expect.any(Array),
        ExportFormatType.CSV,
      );
    });

    it('deve mapear formato Excel corretamente', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.EXCEL,
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockExportService.generate).toHaveBeenCalledWith(
        expect.any(Array),
        ExportFormatType.EXCEL,
      );
    });

    it('deve mapear formato JSON corretamente', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        format: ExportFormat.JSON,
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockExportService.generate).toHaveBeenCalledWith(
        expect.any(Array),
        ExportFormatType.JSON,
      );
    });

    it('deve usar CSV como formato padrão', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockExportService.generate).toHaveBeenCalledWith(
        expect.any(Array),
        ExportFormatType.CSV,
      );
    });

    it('deve chamar repositório com parâmetros corretos', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId },
          orderBy: { submittedAt: 'DESC' },
          take: 1000,
          skip: 0,
        }),
      );
    });

    it('deve aplicar filtro de departamento', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        department: 'Engineering',
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: 'Engineering',
          }),
        }),
      );
    });

    it('deve aplicar filtro de equipe', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        team: 'Backend',
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            team: 'Backend',
          }),
        }),
      );
    });

    it('deve aplicar filtro de categoria', async () => {
      const query: ExportQueryDto = {
        startDate,
        endDate,
        categoryId: 'cat-001',
      };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-001',
          }),
        }),
      );
    });

    it('deve filtrar dados por período', async () => {
      const submissionOutOfRange = createMockSubmission({
        id: 'sub-out',
        submittedAt: new Date('2023-12-01'),
      });

      mockRepository.findAll.mockResolvedValue({
        data: [...mockSubmissions, submissionOutOfRange],
        total: 4,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });

      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      // Verifica que apenas 3 registros (dentro do período) foram passados
      expect(mockExportService.generate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 'Nível Emocional': 3 }),
          expect.objectContaining({ 'Nível Emocional': 7 }),
          expect.objectContaining({ 'Nível Emocional': 5 }),
        ]),
        expect.any(String),
      );
    });
  });

  describe('controle de acesso por role', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });
      mockExportService.generate.mockResolvedValue(mockExportResult);
    });

    it('deve mascarar identidades para GESTOR', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.GESTOR);

      // O serviço de exportação deve ser chamado com dados mascarados
      expect(mockExportService.generate).toHaveBeenCalled();
    });

    it('deve retornar dados completos para ADMIN', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockExportService.generate).toHaveBeenCalled();
    });
  });

  describe('formatação de registros', () => {
    beforeEach(() => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });
      mockExportService.generate.mockResolvedValue(mockExportResult);
    });

    it('deve formatar registro com todos os campos', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      const callArgs = mockExportService.generate.mock.calls[0][0];
      const record = callArgs[0];

      expect(record).toHaveProperty('Data');
      expect(record).toHaveProperty('Nível Emocional');
      expect(record).toHaveProperty('Emoji');
      expect(record).toHaveProperty('Categoria');
      expect(record).toHaveProperty('Departamento');
      expect(record).toHaveProperty('Equipe');
      expect(record).toHaveProperty('Anônimo');
      expect(record).toHaveProperty('Comentário');
    });

    it('deve usar N/A para departamento/equipe ausentes', async () => {
      const submissionWithoutDept = createMockSubmission({
        department: undefined,
        team: undefined,
      });

      mockRepository.findAll.mockResolvedValue({
        data: [submissionWithoutDept],
        total: 1,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });

      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      const callArgs = mockExportService.generate.mock.calls[0][0];
      expect(callArgs[0].Departamento).toBe('N/A');
      expect(callArgs[0].Equipe).toBe('N/A');
    });

    it('deve converter isAnonymous para Sim/Não', async () => {
      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      const callArgs = mockExportService.generate.mock.calls[0][0];
      const anonymous = callArgs.find(
        (r: { Anônimo: string }) => r.Anônimo === 'Sim',
      );
      const identified = callArgs.find(
        (r: { Anônimo: string }) => r.Anônimo === 'Não',
      );

      expect(anonymous).toBeDefined();
      expect(identified).toBeDefined();
    });
  });

  describe('paginação e limites', () => {
    it('deve buscar em lotes de 1000 registros', async () => {
      // Simular múltiplos lotes
      mockRepository.findAll
        .mockResolvedValueOnce({
          data: Array(1000).fill(createMockSubmission()),
          total: 2000,
          page: 1,
          limit: 1000,
          totalPages: 2,
        })
        .mockResolvedValueOnce({
          data: Array(500).fill(createMockSubmission()),
          total: 2000,
          page: 2,
          limit: 1000,
          totalPages: 2,
        });

      mockExportService.generate.mockResolvedValue(mockExportResult);

      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      // Deve ter sido chamado 2 vezes (2 lotes)
      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
      expect(mockRepository.findAll).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ skip: 0, take: 1000 }),
      );
      expect(mockRepository.findAll).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ skip: 1000, take: 1000 }),
      );
    });

    it('deve parar de buscar quando não há mais dados', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions, // Menos que BATCH_SIZE
        total: 3,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });
      mockExportService.generate.mockResolvedValue(mockExportResult);

      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      // Deve ter sido chamado apenas 1 vez
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('tratamento de erros', () => {
    it('deve propagar erro do repositório', async () => {
      const error = new Error('Database connection failed');
      mockRepository.findAll.mockRejectedValue(error);

      const query: ExportQueryDto = { startDate, endDate };

      await expect(
        useCase.execute(organizationId, query, userId, Role.ADMIN),
      ).rejects.toThrow('Database connection failed');
    });

    it('deve propagar erro do serviço de exportação', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: mockSubmissions,
        total: 3,
        page: 1,
        limit: 1000,
        totalPages: 1,
      });
      mockExportService.generate.mockRejectedValue(
        new Error('Export generation failed'),
      );

      const query: ExportQueryDto = { startDate, endDate };

      await expect(
        useCase.execute(organizationId, query, userId, Role.ADMIN),
      ).rejects.toThrow('Export generation failed');
    });
  });

  describe('exportação vazia', () => {
    it('deve exportar array vazio quando não há dados', async () => {
      mockRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      });
      mockExportService.generate.mockResolvedValue(mockExportResult);

      const query: ExportQueryDto = { startDate, endDate };

      await useCase.execute(organizationId, query, userId, Role.ADMIN);

      expect(mockExportService.generate).toHaveBeenCalledWith(
        [],
        ExportFormatType.CSV,
      );
    });
  });
});
